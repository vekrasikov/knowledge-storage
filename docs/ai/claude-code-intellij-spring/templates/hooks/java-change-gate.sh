#!/usr/bin/env bash
# PostToolUse hook: Edit|Write|MultiEdit
#
# Быстрые детерминированные ворота после каждой правки. Смысл: агент узнаёт об ошибке
# за секунды, а не через пять шагов. Всё, что должно выполняться ВСЕГДА, живёт здесь,
# а не в skill — скиллы срабатывают вероятностно, hooks нет.
#
# Контракт с Claude Code:
#   exit 0            — всё хорошо, stdout как JSON (или пусто)
#   exit 2            — блокирующая ошибка, stderr уходит модели
#   любой другой код  — не блокирует, ошибка просто логируется
#
# Установка: .claude/hooks/java-change-gate.sh, chmod +x

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

INPUT="$(cat)"

# --- какой файл трогали -------------------------------------------------------
# Без jq, чтобы не тащить зависимость: грубый, но достаточный разбор.
FILE_PATH="$(printf '%s' "$INPUT" \
  | tr ',' '\n' \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*:[[:space:]]*"//; s/"$//')"

[ -z "$FILE_PATH" ] && exit 0

emit_context() {
  # additionalContext уезжает Клоду как результат хука
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":%s}}\n' \
    "$(printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
}

# --- ворота на миграции -------------------------------------------------------
# Самая частая ошибка агента на Spring: поменял @Entity, забыл миграцию.
case "$FILE_PATH" in
  *src/main/resources/db/migration/*)
    # правка УЖЕ применённой миграции — почти всегда ошибка
    if git ls-files --error-unmatch "$FILE_PATH" >/dev/null 2>&1; then
      echo "Файл $FILE_PATH — уже закоммиченная миграция. Применённые миграции не редактируются: Flyway упадёт на checksum mismatch. Создай новую версию V{n+1}__*.sql." >&2
      exit 2
    fi
    ;;
esac

case "$FILE_PATH" in
  *.java)
    if grep -qE '@(Entity|Embeddable|MappedSuperclass)\b' "$FILE_PATH" 2>/dev/null; then
      # есть ли в незакоммиченных изменениях хоть одна новая миграция
      if ! git status --porcelain 2>/dev/null | grep -q 'db/migration/'; then
        emit_context "Файл $FILE_PATH содержит JPA-сущность, но среди незакоммиченных изменений нет ни одной миграции в db/migration/. Если структура таблицы изменилась — добавь миграцию Flyway в этом же изменении. Если изменение чисто поведенческое, продолжай."
      fi
    fi
    ;;
  *) exit 0 ;;
esac

# --- компиляция ---------------------------------------------------------------
GRADLE="./gradlew"
[ -x "$GRADLE" ] || GRADLE="gradle"

COMPILE_OUT="$($GRADLE --offline -q compileJava compileTestJava 2>&1)"
COMPILE_RC=$?

if [ $COMPILE_RC -ne 0 ]; then
  {
    echo "Компиляция упала после правки $FILE_PATH. Почини перед тем, как идти дальше."
    echo "---"
    printf '%s\n' "$COMPILE_OUT" | tail -60
  } >&2
  exit 2
fi

# --- формат -------------------------------------------------------------------
$GRADLE --offline -q spotlessApply >/dev/null 2>&1

emit_context "Компиляция прошла, spotlessApply применён. Дальше: вызови mcp__ide__getDiagnostics по $FILE_PATH (инспекции IDEA ловят то, чего не видит javac), затем запусти затронутые тесты."
exit 0
