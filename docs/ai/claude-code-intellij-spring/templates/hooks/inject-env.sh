#!/usr/bin/env bash
# UserPromptSubmit hook
#
# Подмешивает в каждый промпт дешёвый фактический контекст, который иначе агент
# добывает вызовами инструментов: ветка, незакоммиченные файлы, доступность IDE.
# Держите вывод коротким — он уходит с КАЖДЫМ сообщением.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
DIRTY="$(git status --porcelain 2>/dev/null | head -12)"
DIRTY_COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if compgen -G "$CONFIG_DIR/ide/*.lock" > /dev/null 2>&1; then IDE="да"; else IDE="нет"; fi

CTX="Ветка: $BRANCH | IDE подключена: $IDE | изменённых файлов: $DIRTY_COUNT"
if [ -n "$DIRTY" ]; then
  CTX="$CTX
$DIRTY"
fi

python3 - "$CTX" <<'PY'
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": sys.argv[1],
    }
}))
PY
