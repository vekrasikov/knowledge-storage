#!/usr/bin/env bash
# SessionStart hook: startup|resume
#
# Проблема, которую решает: скиллы и правила, завязанные на IDE-MCP, молча деградируют,
# когда IDE не запущена. Пустой ответ MCP-инструмента неотличим от «ничего не найдено»,
# и агент начинает уверенно врать. Лучше сказать об этом на старте сессии.

set -uo pipefail

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
IDE_LOCKS="$CONFIG_DIR/ide"

CONTEXT=""

if compgen -G "$IDE_LOCKS/*.lock" > /dev/null 2>&1; then
  CONTEXT="IDE подключена: доступны mcp__ide__getDiagnostics, диффы в нативном вьювере и контекст выделения."
else
  CONTEXT="IDE НЕ подключена (нет lock-файла в $IDE_LOCKS). Инструменты IDE и Spring MCP недоступны или отдадут пустой результат. Не выдумывай структуру проекта по их молчанию — работай через Grep/Glob и Gradle. Чтобы подключить: запусти claude из терминала IDEA или выполни /ide."
fi

# состояние сборки — дешёвый контекст, который экономит агенту вызовы
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
JDK="$(java -version 2>&1 | head -1)"
BOOT_VER="$(grep -rhoE 'org\.springframework\.boot[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)' \
  build.gradle build.gradle.kts pom.xml 2>/dev/null | head -1)"

CONTEXT="$CONTEXT
Ветка: $BRANCH
JDK: $JDK
Spring Boot: ${BOOT_VER:-не определён}"

python3 - "$CONTEXT" <<'PY'
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": sys.argv[1],
    }
}))
PY
