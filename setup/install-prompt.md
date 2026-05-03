# Промпт для установки локальной памяти Claude Code (Mac M1)

Откройте `claude` в терминале на Mac, **в любой пустой папке** (например `~/`), и вставьте всё, что ниже черты, одним сообщением. Claude выполнит установку шаг за шагом, спрашивая подтверждение перед изменением файлов.

Время установки: 15–25 минут (большая часть — скачивание моделей Ollama).

---

# ROLE

Ты — установщик локальной системы памяти для Claude Code на Mac M1. Тебе нужно поднять три слоя памяти:

- **L1**: глобальный `~/.claude/CLAUDE.md` с протоколом памяти.
- **L2**: OpenMemory MCP (self-hosted, через Docker) — короткие факты и предпочтения.
- **L3**: `smart-connections-mcp` — RAG поверх уже существующего Obsidian vault'а с плагином Smart Connections.

Плюс четыре lifecycle-хука (`SessionStart`, `UserPromptSubmit`, `Stop`, `PreCompact`), которые делают использование памяти автоматическим.

# ПРАВИЛА БЕЗОПАСНОСТИ — соблюдать строго

1. **Никогда не перезаписывай существующие файлы без бэкапа.** Если `~/.claude/CLAUDE.md` или `~/.claude/settings.json` уже существуют — сначала копия в `<file>.backup-<timestamp>`, потом аккуратный merge или вопрос пользователю.
2. **Спрашивай подтверждение** перед каждым из этих действий: установка brew-пакетов, запуск `docker compose up`, перезапись CLAUDE.md, перезапись settings.json, регистрация MCP, скачивание моделей Ollama (>1 ГБ).
3. **Идемпотентность**: каждый шаг должен корректно отрабатывать, если его уже делали ранее (проверка перед действием).
4. **Не закрывай сессию пользователя**: если Ollama/Docker уже запущены — не трогай их без причины.
5. **Покажи план перед началом** и жди явного «ок» от пользователя.

# ПРЕДВАРИТЕЛЬНЫЕ ПРОВЕРКИ — выполни до начала установки

Запусти и покажи результат:

```bash
sw_vers && uname -m
which brew node python3 docker claude jq curl git
ls -d ~/.claude 2>/dev/null && ls ~/.claude/ 2>/dev/null
ls -d /Applications/Obsidian.app 2>/dev/null
ollama --version 2>/dev/null || echo "ollama: not installed"
```

После этого спроси у пользователя три вещи и дождись ответов:

1. **Путь к Obsidian vault** (например `/Users/имя/Notes/MyVault`).
2. **Объём ОЗУ** для выбора модели Ollama: 16/32/64 ГБ.
3. **Подтверждение запуска**: «начинаем установку?»

Если каких-то prerequisites нет (brew/node/docker/claude) — предложи установить их через `brew install ...` и спроси подтверждение перед каждым.

# ШАГ 1. Базовые пакеты

```bash
# Если не установлены — устанавливаем (с подтверждением)
brew install jq curl git node python@3.11 || true
brew install --cask docker || true   # если Docker Desktop ещё нет
brew install ollama
```

После установки Ollama:

```bash
brew services start ollama
sleep 3
curl -s http://localhost:11434/api/tags >/dev/null && echo "ollama: OK" || echo "ollama: FAIL"
```

# ШАГ 2. Скачать модели Ollama

Эмбеддинги — обязательно. Чат-модель — для extraction-хука (Stop), без неё хук просто не будет писать память.

```bash
ollama pull nomic-embed-text          # ~274 МБ, обязательно

# Чат-модель — выбери одну под ОЗУ:
# 16 ГБ:
ollama pull qwen2.5:7b                # ~5 ГБ
# 32 ГБ:
ollama pull qwen2.5:14b               # ~9 ГБ
# 64 ГБ:
ollama pull qwen2.5:32b-instruct-q4_K_M  # ~20 ГБ
```

Спроси у пользователя выбор и pull только нужное. Запиши выбранное имя модели в переменную `DISTIL_MODEL` для подстановки в хуки ниже.

# ШАГ 3. Поднять OpenMemory локально

```bash
mkdir -p ~/tools && cd ~/tools
if [ ! -d openmemory ]; then
  git clone https://github.com/CaviraOSS/OpenMemory.git openmemory
fi
cd openmemory

# Проверить, что есть docker-compose.yml
ls -la docker-compose.yml || ls -la compose.yml

# Запросить подтверждение перед запуском
docker compose up -d

# Подождать здоровье
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:8765/api/health 2>/dev/null | grep -qi "ok\|healthy\|true"; then
    echo "openmemory: OK"
    break
  fi
  sleep 2
done
```

Если в репозитории CaviraOSS API path или порт другой — посмотри их README и адаптируй URL. Запиши финальный URL в переменную `OPENMEMORY_URL` (по умолчанию `http://localhost:8765`).

# ШАГ 4. Поставить smart-connections-mcp

Этот сервер читает уже вычисленные Smart Connections эмбеддинги из vault'а — не индексирует повторно.

```bash
cd ~/tools
if [ ! -d smart-connections-mcp ]; then
  git clone https://github.com/dan6684/smart-connections-mcp.git
fi
cd smart-connections-mcp

# Установить зависимости и собрать (формат может отличаться — следуй README репо)
if [ -f package.json ]; then
  npm install
  npm run build 2>/dev/null || true
elif [ -f pyproject.toml ]; then
  uv sync || pip install -e .
fi
```

Перед регистрацией убедись, что сервер запускается:

```bash
# Для node-варианта:
node ~/tools/smart-connections-mcp/dist/index.js --help 2>/dev/null || \
  node ~/tools/smart-connections-mcp/index.js --help 2>/dev/null

# Если в README другой entrypoint — используй его. Запиши путь в SC_ENTRY.
```

Также проверь, что в vault пользователя есть директория `.smart-env/`:

```bash
VAULT="<путь_к_vault_от_пользователя>"
ls -la "$VAULT/.smart-env" 2>/dev/null && echo "smart-env: OK" || \
  echo "WARNING: .smart-env не найдена. Нужно открыть Obsidian, включить Smart Connections и дать ему проиндексировать vault."
```

Если `.smart-env/` нет — **остановись** и попроси пользователя:
1. Открыть Obsidian.
2. Settings → Community plugins → включить Smart Connections.
3. Дождаться, пока индексация завершится (статус-бар внизу).
4. Вернуться сюда.

# ШАГ 5. Зарегистрировать MCP-серверы в Claude Code

```bash
# OpenMemory
claude mcp add openmemory \
  --scope user \
  --command "npx" \
  --args "-y" "@openmemory/mcp" \
  --env "OPENMEMORY_URL=http://localhost:8765"

# (Если @openmemory/mcp недоступен — используй официальный путь из README CaviraOSS:
# claude mcp add openmemory --scope user --command "node" --args "/Users/USER/tools/openmemory/mcp/index.js" ...)

# Smart Connections
claude mcp add smart-connections \
  --scope user \
  --command "node" \
  --args "/Users/USER/tools/smart-connections-mcp/dist/index.js" \
  --env "OBSIDIAN_VAULT_PATH=<VAULT_PATH>"

# Проверить
claude mcp list
claude mcp doctor openmemory
claude mcp doctor smart-connections
```

Подставь реальный `<VAULT_PATH>` и реальное `USER`. Если `claude mcp doctor` ругается — покажи лог и спроси пользователя.

# ШАГ 6. Установить хуки

Создай директорию и скопируй четыре файла. Все hook-скрипты должны иметь `chmod +x` и не блокировать Claude Code на ошибках (fail-soft).

```bash
mkdir -p ~/.claude/hooks ~/.claude/logs
```

## 6.1. `~/.claude/hooks/_common.sh`

```bash
#!/usr/bin/env bash
# Shared helpers for Claude Code memory hooks.
set -u

: "${OPENMEMORY_URL:=http://localhost:8765}"
: "${OLLAMA_URL:=http://localhost:11434}"
: "${OLLAMA_DISTIL_MODEL:=qwen2.5:7b}"
: "${HOOK_LOG:=$HOME/.claude/logs/hooks.log}"
: "${HOOK_TIMEOUT:=8}"

mkdir -p "$(dirname "$HOOK_LOG")" 2>/dev/null || true

log() {
  printf '[%s] [%s] %s\n' "$(date -u +%FT%TZ)" "${HOOK_NAME:-hook}" "$*" \
    >>"$HOOK_LOG" 2>/dev/null || true
}

endpoint_alive() {
  curl -s --max-time 2 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null \
    | grep -qE '^(2|3)'
}

read_input_once() {
  if [ -z "${_HOOK_INPUT_FILE:-}" ]; then
    _HOOK_INPUT_FILE=$(mktemp)
    cat >"$_HOOK_INPUT_FILE"
  fi
  cat "$_HOOK_INPUT_FILE"
}

input_field() {
  read_input_once | jq -r "$1 // empty" 2>/dev/null
}

http_post_json() {
  curl -sS --max-time "$HOOK_TIMEOUT" \
    -H 'Content-Type: application/json' \
    -X POST "$1" -d "$2" 2>/dev/null
}

om_search() {
  local query="$1"; local k="${2:-15}"
  endpoint_alive "$OPENMEMORY_URL/api/health" || { log "openmemory unreachable"; return 0; }
  local payload
  payload=$(jq -nc --arg q "$query" --argjson k "$k" '{query:$q, top_k:$k}')
  http_post_json "$OPENMEMORY_URL/api/v1/search" "$payload" \
    | jq -r '.results[]?.text // empty | "- " + .' 2>/dev/null
}

om_add() {
  local text="$1"; local source="${2:-claude-code-hook}"; local tags_json="${3:-[]}"
  endpoint_alive "$OPENMEMORY_URL/api/health" || return 0
  local payload
  payload=$(jq -nc --arg t "$text" --arg s "$source" --argjson tags "$tags_json" \
    '{text:$t, source:$s, tags:$tags}')
  http_post_json "$OPENMEMORY_URL/api/v1/add" "$payload" >/dev/null
  log "om_add: $text"
}

ollama_extract() {
  local model="$1"; local prompt="$2"
  endpoint_alive "$OLLAMA_URL/api/tags" || { log "ollama unreachable"; return 0; }
  local payload
  payload=$(jq -nc --arg m "$model" --arg p "$prompt" \
    '{model:$m, prompt:$p, stream:false, options:{temperature:0.2}}')
  http_post_json "$OLLAMA_URL/api/generate" "$payload" \
    | jq -r '.response // empty' 2>/dev/null
}

current_scope() {
  basename "${1:-$PWD}" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9._-' '_'
}
```

## 6.2. `~/.claude/hooks/session-start.sh`

```bash
#!/usr/bin/env bash
# Загружает релевантные факты в начале сессии.
set -u
HOOK_NAME=session-start
. "$HOME/.claude/hooks/_common.sh"

INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD="$PWD"
SCOPE=$(current_scope "$CWD")

# Релевантные глобальные правила + проектные
GLOBAL=$(om_search "global rules preferences" 10)
PROJECT=$(om_search "$SCOPE" 15)

if [ -z "$GLOBAL$PROJECT" ]; then
  log "no memories returned"
  exit 0
fi

cat <<EOF
## Долгосрочная память (auto-loaded)

### Глобальные правила
$GLOBAL

### Этот проект ($SCOPE)
$PROJECT

---
Если в запросе ниже потребуется поиск по моим заметкам — вызывай
\`smart-connections.semantic_search\` ДО ответа.
EOF
```

## 6.3. `~/.claude/hooks/prompt-classify.sh`

```bash
#!/usr/bin/env bash
# Лёгкий классификатор: подсказывает использовать MCP по триггерным словам.
set -u
HOOK_NAME=prompt-classify
. "$HOOK_DIR_OVERRIDE:-$HOME/.claude/hooks}/_common.sh" 2>/dev/null || \
  . "$HOME/.claude/hooks/_common.sh"

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
[ -z "$PROMPT" ] && exit 0

HINTS=""
if echo "$PROMPT" | grep -qiE 'в моих заметках|по моему vault|вспомни|как мы (делали|решали)|что я писал'; then
  HINTS+="- Сначала вызови smart-connections.semantic_search и openmemory.search.\n"
fi
if echo "$PROMPT" | grep -qiE 'confluence|jira|тикет|задач[аеу]'; then
  HINTS+="- Возможно, нужен atlassian MCP (Confluence/Jira).\n"
fi
if echo "$PROMPT" | grep -qiE 'запомни|новое правило|давай теперь всегда'; then
  HINTS+="- В конце ответа явно вызови openmemory.add с этим правилом.\n"
fi

if [ -n "$HINTS" ]; then
  printf '## Подсказка по этому запросу\n%b\n' "$HINTS"
fi
```

## 6.4. `~/.claude/hooks/distil-and-save.sh`

```bash
#!/usr/bin/env bash
# Stop hook: извлекает долгосрочные факты из последнего обмена и пишет в OpenMemory.
set -u
HOOK_NAME=distil-and-save
. "$HOME/.claude/hooks/_common.sh"

INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD="$PWD"
SCOPE=$(current_scope "$CWD")

# Не вызывай себя рекурсивно
[ "$ACTIVE" = "true" ] && exit 0
[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0

# Берём хвост — последние пары user/assistant. 200 строк норм.
LAST=$(tail -200 "$TRANSCRIPT" 2>/dev/null)
[ -z "$LAST" ] && exit 0

# В фоне — чтобы не блокировать сессию
(
  PROMPT=$(cat <<P
Из диалога ниже выпиши ТОЛЬКО долгосрочно полезные факты:
- мои предпочтения по стеку/инструментам/стилю,
- принятые решения с обоснованием,
- новые конвенции команды/проекта,
- грабли, которых стоит избегать.

Каждый факт — одна строка, начинается с [scope: ${SCOPE}|global], затем тема, затем правило.
Если ничего такого в диалоге нет — выведи ровно одну пустую строку и закончи.

ДИАЛОГ:
$LAST
P
)
  FACTS=$(ollama_extract "$OLLAMA_DISTIL_MODEL" "$PROMPT")
  [ -z "$FACTS" ] && exit 0

  while IFS= read -r LINE; do
    [ -z "$(echo "$LINE" | tr -d '[:space:]')" ] && continue
    om_add "$LINE" "stop-hook" "[\"auto\",\"$SCOPE\"]"
  done <<< "$FACTS"
) >>"$HOOK_LOG" 2>&1 &
disown

exit 0
```

## 6.5. `~/.claude/hooks/save-before-compact.sh`

```bash
#!/usr/bin/env bash
# PreCompact hook: сохраняет саммари сессии перед компактированием.
set -u
HOOK_NAME=pre-compact
. "$HOME/.claude/hooks/_common.sh"

INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD="$PWD"
SCOPE=$(current_scope "$CWD")
[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0

ALL=$(cat "$TRANSCRIPT" 2>/dev/null)
[ -z "$ALL" ] && exit 0

(
  PROMPT=$(cat <<P
Сделай саммари сессии Claude Code в формате:
РЕШЕНИЯ: список ключевых решений
ИЗМЕНЕНИЯ: какие файлы/области поменяны
ОТКРЫТЫЕ ВОПРОСЫ: что осталось нерешённым
Кратко, по существу.

СЕССИЯ:
$ALL
P
)
  SUMMARY=$(ollama_extract "$OLLAMA_DISTIL_MODEL" "$PROMPT")
  [ -z "$SUMMARY" ] && exit 0
  om_add "Session summary [$SCOPE]: $SUMMARY" "pre-compact" "[\"session-summary\",\"$SCOPE\"]"
) >>"$HOOK_LOG" 2>&1 &
disown

exit 0
```

После создания всех пяти файлов:

```bash
chmod +x ~/.claude/hooks/*.sh
ls -la ~/.claude/hooks/
```

# ШАГ 7. Глобальный CLAUDE.md

Если `~/.claude/CLAUDE.md` уже существует — **сделай бэкап** `~/.claude/CLAUDE.md.backup-$(date +%s)`, покажи его содержимое пользователю и спроси: дописать секцию памяти к существующему или заменить целиком.

Целевое содержимое (либо как отдельный файл, либо как добавленная секция):

```markdown
# Глобальные правила Claude Code

## Память: как искать ПЕРЕД ответом

У меня три слоя памяти — используй их в этом порядке:

1. **OpenMemory** (MCP `openmemory`) — короткие факты, мои предпочтения,
   принятые решения, конвенции. Вызывай `openmemory.search` с релевантным
   запросом ДО того, как начать отвечать на вопрос про мои привычки,
   настройки, стек, выбор инструментов.

2. **Obsidian vault** (MCP `smart-connections`) — мои заметки, ADR,
   шпаргалки, статьи. Вызывай `smart-connections.semantic_search` если:
   - вопрос технический и я бы посмотрел в шпаргалку,
   - вопрос про прошлое решение или проект,
   - в запросе есть «что я писал», «как мы делали», «найди в заметках».

3. **Confluence/Jira** (MCP `atlassian`, если подключён) — для рабочих
   процессов, тикетов, командных доков.

## Память: что записывать

После значимых обменов хук сам сохранит факты. Но если в ответ
я говорю «давай теперь всегда так», «запомни», «это новое правило»,
«не забывай про X» — явно вызови `openmemory.add` с этим фактом
в формате `[scope: <project>|global] <тема>: <правило> (контекст)`.

Не записывай в память:
- Содержимое файлов (это RAG-задача).
- Длинные объяснения (это в Obsidian).
- Временный одноразовый контекст.

## Цитирование источников

- Из vault: `[[путь/к/заметке]]` (Wikilink-формат).
- Из памяти: `(memory: <короткая цитата>)`.
- Из Confluence: ссылка на страницу.

## Поведение

- Перед ответом на технический вопрос — проверь vault через `semantic_search`.
- Если факты из памяти противоречат друг другу — спроси меня, какой актуален.
- Никогда не отвечай «у меня нет информации», не попытавшись найти в трёх слоях.
- Если поиск ничего не дал — скажи это явно и предложи добавить в память.
```

# ШАГ 8. settings.json с хуками

Если `~/.claude/settings.json` уже существует — **обязательно** сделай бэкап и используй `jq` для слияния, **не перезаписывай**.

Целевая структура (то, что должно появиться):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/session-start.sh" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/prompt-classify.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/distil-and-save.sh" }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/save-before-compact.sh" }
        ]
      }
    ]
  }
}
```

Алгоритм слияния (используй на bash):

```bash
SETTINGS=~/.claude/settings.json
NEW=$(mktemp)

# Эталон новых хуков
cat >"$NEW" <<'JSON'
{ ... вставь JSON выше ... }
JSON

if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.backup-$(date +%s)"
  jq -s '.[0] * .[1]' "$SETTINGS" "$NEW" > "$SETTINGS.new"
  mv "$SETTINGS.new" "$SETTINGS"
else
  cp "$NEW" "$SETTINGS"
fi

# Замена ~ на абсолютный путь, чтобы Claude Code находил скрипты
sed -i '' "s|~/.claude/hooks|$HOME/.claude/hooks|g" "$SETTINGS"

# Покажи итог
jq . "$SETTINGS"
```

Подтверди у пользователя итоговый settings.json перед тем, как считать шаг завершённым.

# ШАГ 9. Финальная проверка

Заверши установкой и проверь end-to-end:

```bash
# 1. Сервисы
curl -s http://localhost:11434/api/tags | jq '.models[].name' || echo "ollama: FAIL"
curl -s http://localhost:8765/api/health || echo "openmemory: FAIL"

# 2. MCPs
claude mcp list

# 3. Хуки
ls -la ~/.claude/hooks/
test -x ~/.claude/hooks/session-start.sh && echo "hook session-start: ok"

# 4. CLAUDE.md
head -20 ~/.claude/CLAUDE.md

# 5. Тест записи в OpenMemory
curl -sS -X POST http://localhost:8765/api/v1/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"[global] test: установка завершена","source":"installer"}'

# 6. Тест чтения
curl -sS -X POST http://localhost:8765/api/v1/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"установка","top_k":3}' | jq

# 7. Smart Connections доступ
ls -la "<VAULT_PATH>/.smart-env/" | head -5
```

# ШАГ 10. Демо для пользователя

Скажи пользователю:

> Установка завершена. Запусти **новую** сессию Claude Code в любом проекте:
>
> ```
> cd ~/Notes/MyVault   # или любой рабочий проект
> claude
> ```
>
> Проверь три сценария:
>
> 1. **Чтение памяти**: «Какие у меня предпочтения по коммитам?» — должен вызвать `openmemory.search`.
> 2. **Поиск по vault**: «Что я писал про <твоя тема>?» — должен вызвать `smart-connections.semantic_search` и вернуть `[[ссылки]]`.
> 3. **Запись правила**: «Запомни: в этом проекте используем <X> вместо <Y>». Закрой сессию, открой снова, спроси «какой стек в этом проекте» — Claude должен помнить.
>
> Логи хуков: `~/.claude/logs/hooks.log`.
> Удалить установку: `~/tools/openmemory && docker compose down -v`, потом убрать MCPs через `claude mcp remove openmemory smart-connections`, удалить `~/.claude/hooks/` и восстановить `*.backup-*`.

# В КОНЦЕ — отчёт

Покажи короткий отчёт:

- ✅/❌ что установлено
- ✅/❌ что зарегистрировано в Claude Code
- ✅/❌ результат финальных проверок
- список созданных и забэкапленных файлов
- возможные проблемы / нерешённые вопросы

Если на каком-то шаге всё пошло не так — НЕ продолжай слепо, **остановись, опиши проблему и спроси**, что делать.
