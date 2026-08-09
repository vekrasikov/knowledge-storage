#!/usr/bin/env bash
# Stop hook
#
# Последний детерминированный барьер перед тем, как Клод отдаст управление.
# Гоняет ArchUnit и тесты, затронутые изменёнными файлами. Полный прогон — в CI,
# здесь важна скорость: барьер, который занимает пять минут, вы отключите через день.
#
# exit 2 -> Клод не заканчивает ход, stderr уходит ему как задача на доделку.
#
# Защита от цикла: если хук уже блокировал этот ход, второй раз не блокируем.

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

INPUT="$(cat)"
case "$INPUT" in
  *'"stop_hook_active":true'*) exit 0 ;;
esac

GRADLE="./gradlew"
[ -x "$GRADLE" ] || GRADLE="gradle"

CHANGED="$(git diff --name-only HEAD 2>/dev/null; git diff --cached --name-only 2>/dev/null)"
JAVA_CHANGED="$(printf '%s\n' "$CHANGED" | grep -E '\.java$' | sort -u)"

[ -z "$JAVA_CHANGED" ] && exit 0

FAILURES=""

# --- архитектурные правила ----------------------------------------------------
if ls src/test/java/**/ArchitectureTest.java >/dev/null 2>&1 \
   || find src/test -name 'ArchitectureTest.java' -print -quit 2>/dev/null | grep -q .; then
  if ! OUT="$($GRADLE --offline -q test --tests 'ArchitectureTest' 2>&1)"; then
    FAILURES="$FAILURES

ArchUnit упал:
$(printf '%s\n' "$OUT" | tail -40)"
  fi
fi

# --- тесты, затронутые изменениями -------------------------------------------
# Простая эвристика по имени: FooService.java -> *FooService*Test.
# Намеренно грубо: цель — поймать очевидную регрессию, а не заменить CI.
PATTERNS=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="$(basename "$f" .java)"
  case "$base" in
    *Test|*Tests|*IT) PATTERNS="$PATTERNS --tests *${base}" ;;
    *)                PATTERNS="$PATTERNS --tests *${base}Test --tests *${base}Tests" ;;
  esac
done <<< "$JAVA_CHANGED"

if [ -n "$PATTERNS" ]; then
  # shellcheck disable=SC2086
  if ! OUT="$($GRADLE --offline -q test $PATTERNS 2>&1)"; then
    # «нет тестов по фильтру» — не провал
    if ! printf '%s' "$OUT" | grep -qi 'no tests found for given includes'; then
      FAILURES="$FAILURES

Затронутые тесты упали:
$(printf '%s\n' "$OUT" | tail -60)"
    fi
  fi
fi

if [ -n "$FAILURES" ]; then
  {
    echo "Работа не завершена — проверки не прошли. Почини и проверь снова.$FAILURES"
  } >&2
  exit 2
fi

exit 0
