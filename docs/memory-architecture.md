# Архитектура памяти Claude Code: OpenMemory + Obsidian RAG

Полная схема долгосрочной памяти для локальной разработки: как объединить **OpenMemory** (короткие структурированные факты, правила, предпочтения) и **Obsidian + Smart Connections** (документная память) так, чтобы Claude Code пользовался обоими **автоматически**, без ручного «вспомни...», и чтобы память **сама обновлялась** по триггерам.

Этот документ — третий в серии. Предыдущие:
- [claude-code-obsidian-rag-guide.md](./claude-code-obsidian-rag-guide.md) — как поставить локальный RAG.
- [obsidian-setup-for-engineers.md](./obsidian-setup-for-engineers.md) — настройка Obsidian.

---

## Содержание

1. [Принцип разделения: что куда кладём](#принцип-разделения)
2. [Архитектура](#архитектура)
3. [Готовые решения, которые экономят неделю](#готовые-решения)
4. [Рекомендуемый стек для вашего кейса](#рекомендуемый-стек)
5. [Автоматизация через Claude Code хуки](#автоматизация-через-хуки)
6. [CLAUDE.md как «вход» в память](#claudemd-как-вход-в-память)
7. [Жизненный цикл одного факта](#жизненный-цикл-одного-факта)
8. [Что хранить в OpenMemory: правила и best practices](#что-хранить-в-openmemory)
9. [Setup пошагово](#setup-пошагово)
10. [Триггеры обновления и актуализации](#триггеры-обновления)
11. [Антипаттерны](#антипаттерны)
12. [Источники и статьи](#источники)

---

## Принцип разделения

Самая частая ошибка — пытаться запихнуть всё в один store. Память Claude должна жить в **трёх слоях**, и роли у них разные:

| Слой | Где живёт | Что хранит | Объём | Кто пишет |
|---|---|---|---|---|
| **L1: Project rules** | `CLAUDE.md` (in-repo + global) | Проектные конвенции, must-do/never-do, путеводитель по архитектуре | Сотни строк | Вы вручную + Claude по команде |
| **L2: Long-term memory** | OpenMemory / mem0 | Короткие факты: предпочтения, решения, паттерны, «у меня такое-то окружение» | Тысячи мелких фактов | Хуки автоматически + явные `/remember` |
| **L3: Document RAG** | Obsidian + Smart Connections | Заметки, ADR, шпаргалки, статьи, PDF — длинный текст | Тысячи документов | Вы пишете в Obsidian, индекс обновляется сам |

Правило, которое спасает:

> **Если факт можно сжать до одной фразы** («предпочитаю Kotlin coroutines над RxJava» / «БД prod-окружения — Postgres 16, не используем JSONB кроме audit-таблиц») → это L2 (OpenMemory).
>
> **Если это полстраницы и больше** (объяснение паттерна, ADR, конспект) → это L3 (Obsidian).
>
> **Если это «всегда делай X в этом репо»** → L1 (CLAUDE.md).

Дублирование между слоями допустимо в одном направлении: OpenMemory может хранить **указатели** на заметки в vault («подробности saga-pattern → `[[20-areas/patterns/saga.md]]`»). Но не наоборот.

---

## Архитектура

```
┌───────────────────────────────────────────────────────────────────┐
│ Claude Code (CLI / chat UI)                                       │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
  ┌────▼────┐         ┌──────────▼──────────┐       ┌───────▼───────┐
  │ CLAUDE. │         │ HOOKS               │       │ MCP servers   │
  │ md      │         │ ───                 │       │ ───           │
  │ (L1)    │         │ SessionStart →      │       │ openmemory    │
  │ читает- │         │   load context      │       │ smart-conn.   │
  │ ся при  │         │ UserPromptSubmit →  │       │ atlassian     │
  │ старте  │         │   pre-fetch         │       │ filesystem    │
  │ + после │         │ Stop / SubagentStop │       │               │
  │ /compact│         │   → write memory    │       │               │
  └─────────┘         │ PreCompact →        │       └───┬─────┬─────┘
                      │   distil & save     │           │     │
                      └──────────┬──────────┘           │     │
                                 │                      │     │
                                 ▼                      ▼     ▼
                  ┌─────────────────────┐    ┌──────────┐  ┌────────────┐
                  │ OpenMemory MCP      │    │ Smart    │  │ Atlassian  │
                  │ (L2)                │    │ Conn.    │  │ Confluence │
                  │ ──                  │    │ MCP      │  │ Jira       │
                  │ короткие факты,     │    │ ──       │  │            │
                  │ extract→ADD/UPDATE/ │    │ читает   │  │            │
                  │ DELETE/NOOP         │    │ .smart-  │  │            │
                  │ векторное хранилище │    │ env/     │  │            │
                  │ Qdrant внутри       │    │ напрямую │  │            │
                  └─────────────────────┘    └────┬─────┘  └────────────┘
                                                  │
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Obsidian vault (L3)  │
                                       │ + Smart Connections  │
                                       │ плагин с эмбеддин-   │
                                       │ гами .smart-env/     │
                                       │                      │
                                       │ автоиндексация при   │
                                       │ изменении файлов     │
                                       └──────────────────────┘
```

Ключевое:

1. **Хуки — это и есть автоматика.** Без них «автоматически» не получится: Claude Code сам не вызывает MCP, пока его не попросят. Хуки делают вызов за пользователя.
2. **Smart Connections уже даёт эмбеддинги.** `smart-connections-mcp` не индексирует vault повторно — он читает `.smart-env/` (там бинарные файлы с векторами от плагина). Один источник эмбеддингов = нет дрейфа.
3. **CLAUDE.md устойчив к компактированию.** После `/compact` Claude перечитывает его с диска и переинжектит в сессию. Поэтому правила безопасно класть туда.
4. **OpenMemory — не RAG.** Он делает экстракцию фактов из диалога и решает ADD / UPDATE / DELETE / NOOP. Это другой алгоритм, чем поиск по чанкам.

---

## Готовые решения

Не изобретайте велосипед — на 2026 есть как минимум четыре готовые сборки, которые покрывают 80% задачи.

### 1. `smart-connections-mcp` (dan6684) ⭐ ваш случай

**Что делает:** Экспонирует уже вычисленные Smart Connections эмбеддинги как MCP-сервер для Claude Code.

**Почему это идеально для вас:** вы уже используете Smart Connections. Этот сервер не дублирует индексацию, читает `.smart-env/*.ajson` файлы плагина напрямую. Нулевые накладные расходы.

**Tools:** `semantic_search`, `find_related`, `get_context_blocks`.

**Минусы:** проект небольшой по звёздам, но работающий и единственный в своей нише.

### 2. Mem0 Claude Code Plugin ⭐ для L2

**Что делает:** Заменяет дефолтную файловую память Claude Code семантическим слоем mem0/OpenMemory. Содержит lifecycle-хуки: автоматический вызов `search_memories` на старте сессии, запись на компактировании, на завершении задачи и сессии.

**Установка:** через marketplace плагинов Claude Code, конфиг через `pip install mem0-mcp-server` + запись в `~/.claude.json`.

**Что получаете «из коробки»:**
- При новой сессии плагин просит Claude вызвать `search_memories` → загружается релевантный контекст.
- На `/compact` сжимает диалог и пишет ключевые факты.
- На завершении задачи извлекает решения и пишет в память.

**Минусы:** дефолтная конфигурация — облачный mem0 (нужен API key). Для полностью локального — собирать self-hosted mem0 или OpenMemory от CaviraOSS.

### 3. `mann1x/claude-hooks` ⭐ для production-grade автоматики

**Что делает:** Кросс-платформенные Claude Code хуки для **детерминированного** memory recall с Qdrant + Memory Knowledge Graph. Включает HyDE (Hypothetical Document Embeddings), attention decay, дедупликацию, instinct extraction.

**Почему интересно:** это самый продуманный набор хуков для памяти на 2026. Если хочется «чтобы всё работало само и качественно» — это ближе всего.

**Минусы:** более тяжёлая установка (Qdrant отдельно), Python-зависимости, требует понимания, что внутри.

### 4. `thedotmack/claude-mem`

**Что делает:** Плагин Claude Code, который автоматически захватывает всё, что Claude делает в сессии, сжимает через Claude Agent SDK и инжектит релевантный контекст в будущие сессии.

**Хорошо для:** того, кто не хочет разбираться в архитектуре, а хочет «поставить и забыть». Но контроля меньше.

### Сравнительная таблица

| Решение | Что покрывает | Сложность setup | Автоматика | Локально |
|---|---|---|---|---|
| `smart-connections-mcp` | L3 (RAG) | низкая | через хуки | да |
| Mem0 plugin | L2 (memory) | низкая | встроена | частично |
| `claude-hooks` (mann1x) | L2 + автоматика | средняя | максимум | да |
| `claude-mem` | L2 (упрощённо) | низкая | встроена | да |

---

## Рекомендуемый стек

Под ваш кейс (локальная разработка, Obsidian + Smart Connections уже есть, нужна полная локальность):

```
L1 — CLAUDE.md
   ├── ~/.claude/CLAUDE.md       (глобальные правила работы Claude)
   └── <project>/CLAUDE.md       (проектные конвенции)

L2 — OpenMemory MCP (self-hosted)
   ├── docker compose up -d из CaviraOSS/OpenMemory
   ├── хранение: Qdrant локально
   └── автоматика: SessionStart + Stop хуки (свои, минимальные)

L3 — Obsidian + Smart Connections + smart-connections-mcp
   ├── Smart Connections индексирует vault автоматически
   ├── smart-connections-mcp читает .smart-env/
   └── ничего больше не нужно
```

Получается **два MCP-сервера** (`openmemory`, `smart-connections`) + **четыре хука** + **два CLAUDE.md** — всё, ничего лишнего. Confluence/Jira — отдельный Atlassian MCP, как было.

Это даёт:
- ✅ Полностью локально, без облачных API.
- ✅ Используются ваши уже существующие Smart Connections эмбеддинги.
- ✅ Память расширяется автоматически по мере диалогов.
- ✅ Правила не нужно повторять в каждом запросе.
- ✅ Контекст переживает `/compact` и рестарт сессии.

---

## Автоматизация через хуки

Это **самая важная часть**. Без хуков всё остальное — это просто доступные инструменты, которые Claude может выбрать использовать или не использовать.

Хуки лежат в `~/.claude/settings.json` (глобально) или `.claude/settings.json` в проекте. Stdout от `SessionStart` и `UserPromptSubmit` инжектится прямо в контекст.

### Минимальный набор хуков

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/prompt-classify.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/distil-and-save.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/save-before-compact.sh"
          }
        ]
      }
    ]
  }
}
```

### Хук 1. `session-start.sh` — загрузка контекста при старте

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/session-start.sh
# Получает на stdin JSON: {session_id, source: "startup"|"resume"|"clear"|"compact", cwd}

set -euo pipefail
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Определяем «тему» сессии — по cwd (имени проекта)
PROJECT=$(basename "$CWD")

# Запрашиваем релевантные факты из OpenMemory
MEMORIES=$(curl -s -X POST http://localhost:8765/api/v1/search \
  -H 'Content-Type: application/json' \
  -d "{\"query\": \"$PROJECT global rules preferences\", \"top_k\": 15}" \
  | jq -r '.results[] | "- " + .text')

# Дополнительно: что было сделано вчера (опционально)
RECENT=""
if [ "$SOURCE" = "startup" ]; then
  RECENT=$(curl -s "http://localhost:8765/api/v1/recent?days=2" \
    | jq -r '.results[] | "- " + .text' || true)
fi

# stdout → инжектится в контекст Claude
cat <<EOF
## Долгосрочная память — релевантное

$MEMORIES

## Недавняя активность (последние 2 дня)

$RECENT

---
Если ниже спросят что-то по теме, где помог бы поиск по vault'у —
вызывай инструмент \`smart-connections.semantic_search\` ДО ответа.
EOF
```

Что это даёт: каждая новая сессия начинается с того, что Claude уже знает ваши предпочтения и недавний контекст, **без единого вашего слова**.

### Хук 2. `prompt-classify.sh` — лёгкий классификатор перед каждым запросом

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/prompt-classify.sh
# Получает на stdin: {session_id, prompt, cwd}

set -euo pipefail
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt')

# Простая эвристика: если в промпте есть «как мы делали», «вспомни», «по нашему стилю»,
# «по моим заметкам» — добавляем подсказку использовать MCP.

HINTS=""
if echo "$PROMPT" | grep -qiE '(в моих заметках|по моему vault|вспомни|как мы (делали|решали))'; then
  HINTS+="Сначала вызови smart-connections.semantic_search и openmemory.search.\n"
fi
if echo "$PROMPT" | grep -qiE '(confluence|jira|тикет|задач[аеу])'; then
  HINTS+="Возможно, нужно сходить в atlassian MCP.\n"
fi

if [ -n "$HINTS" ]; then
  echo "## Подсказка системы по этому запросу"
  echo -e "$HINTS"
fi
```

Зачем: Claude часто не знает, что у вас вообще есть такие источники. Лёгкая подсказка по триггерным словам — сильно повышает hit rate.

### Хук 3. `distil-and-save.sh` — запись в OpenMemory после ответа

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/distil-and-save.sh
# Получает на stdin: {session_id, transcript_path, stop_hook_active, ...}

set -euo pipefail
INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path')
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')

# Не вызываем себя рекурсивно
if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

# Берём последнюю пару user→assistant
LAST=$(tail -200 "$TRANSCRIPT")

# Дёшево: используем локальный Ollama для извлечения фактов
FACTS=$(curl -s http://localhost:11434/api/generate -d "{
  \"model\": \"qwen2.5:7b\",
  \"prompt\": \"Из диалога ниже выпиши ТОЛЬКО долгосрочно полезные факты о пользователе/проекте: предпочтения, принятые решения, новые конвенции. По одному факту на строку, без воды. Если ничего такого нет — выведи пустую строку.\\n\\n$LAST\",
  \"stream\": false
}" | jq -r '.response')

if [ -n "$(echo "$FACTS" | tr -d '[:space:]')" ]; then
  while IFS= read -r FACT; do
    [ -z "$FACT" ] && continue
    curl -s -X POST http://localhost:8765/api/v1/add \
      -H 'Content-Type: application/json' \
      -d "{\"text\": $(echo "$FACT" | jq -Rs .), \"source\": \"claude-code-stop-hook\"}"
  done <<< "$FACTS"
fi

exit 0
```

Зачем: после каждого «значимого» ответа извлекаем потенциальные факты и кладём в OpenMemory. mem0 сам решит ADD/UPDATE/DELETE/NOOP — дубли не накопятся.

⚠️ **Важно:** этот хук вызывается на **каждое** завершение ответа. Если делаете извлечение через локальную модель — это +1-3 секунды к каждому ответу. Терпимо. Если не хотите задержек — переключите на background-вызов с `&` в конце и логированием.

### Хук 4. `save-before-compact.sh` — сохранить ключевое до компактирования

```bash
#!/usr/bin/env bash
# ~/.claude/hooks/save-before-compact.sh
# PreCompact: сохраняем ключевые факты перед тем, как Claude сожмёт историю

set -euo pipefail
INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path')

# Аналогично distil-and-save, но с большим окном — берём всю сессию
ALL=$(cat "$TRANSCRIPT")

SUMMARY=$(curl -s http://localhost:11434/api/generate -d "{
  \"model\": \"qwen2.5:14b\",
  \"prompt\": \"Сделай саммари этой сессии Claude Code в формате: РЕШЕНИЯ (что решено), ИЗМЕНЕНИЯ (какие файлы поменяны), ОТКРЫТЫЕ ВОПРОСЫ. Кратко.\\n\\n$ALL\",
  \"stream\": false
}" | jq -r '.response')

curl -s -X POST http://localhost:8765/api/v1/add \
  -H 'Content-Type: application/json' \
  -d "{\"text\": $(echo "$SUMMARY" | jq -Rs .), \"source\": \"pre-compact-summary\", \"tags\": [\"session-summary\"]}"
```

Зачем: компактирование «съедает» детали. С этим хуком ключевые решения переживут компакт.

---

## CLAUDE.md как «вход» в память

`CLAUDE.md` загружается в каждой сессии **полностью** и **переинжектится после `/compact`**. Это идеальное место для правил, которые должны действовать всегда.

### Глобальный `~/.claude/CLAUDE.md`

```markdown
# Глобальные правила Claude Code

## Память: как искать перед ответом

У меня есть три слоя памяти. Используй их в этом порядке:

1. **OpenMemory** (MCP `openmemory`) — короткие факты, мои предпочтения,
   принятые решения. Вызывай `search` с релевантным запросом ДО того,
   как начать отвечать на вопрос про мои привычки/настройки/выбор.

2. **Obsidian vault** (MCP `smart-connections`) — мои заметки, ADR, шпаргалки.
   Вызывай `semantic_search` если вопрос:
   - технический и ты бы посмотрел в шпаргалку,
   - про прошлое решение или проект,
   - содержит явный или неявный «что я писал про X».

3. **Confluence/Jira** (MCP `atlassian`) — для рабочих процессов и тикетов.

## Память: что записывать

После значимых обменов хук сам сохранит факты. Но если в ответ
я говорю что-то вроде «давай теперь всегда так», «запомни»,
«это новое правило» — явно вызови `openmemory.add` с этим фактом.

Не записывай в память:
- Содержимое файлов (это RAG-задача).
- Длинные объяснения (это в Obsidian).
- Временное (одноразовый запрос).

## Правила работы (всегда)

- Перед ответом на технический вопрос проверь vault через `semantic_search`.
- Цитируй найденные источники: `[[путь/к/заметке]]` для vault, `(memory: ...)` для OpenMemory.
- Если факты из памяти противоречат друг другу — спроси меня, какой актуален.
- Никогда не отвечай «у меня нет информации» без попытки поиска в трёх слоях.
```

### Проектный `<project>/CLAUDE.md`

```markdown
# <project name>

## Память про этот проект

Перед началом работы вызови:
- `openmemory.search` с тегом проекта.
- `smart-connections.semantic_search` по `10-projects/<this-project>/`.

## Конвенции (не повторять — уже в памяти, читай на старте)

- Стек: см. README.md.
- ADR: в `decisions/`. Перед архитектурным изменением сначала проверь, нет ли существующего ADR.
- Тесты: ...
- Деплой: ...

## Что НЕ делать

- ...
```

### Почему это работает

- Глобальный CLAUDE.md задаёт **протокол использования памяти** — Claude знает, когда и куда смотреть.
- Хуки **гарантируют**, что инструменты будут вызваны (а не просто «доступны»).
- Smart Connections индексирует vault сам в фоне — RAG актуализируется без вашего участия.
- OpenMemory сам делает дедупликацию — лишних фактов не накопится.

---

## Жизненный цикл одного факта

Чтобы было понятнее, разберём, что происходит, когда вы говорите:
> «Давай в этом проекте использовать Pydantic v2 вместо marshmallow.»

1. **Claude отвечает** на сообщение, выполняет задачу.
2. **Stop хук** срабатывает → `distil-and-save.sh` вызывает локальную модель → она извлекает факт: «Проект `<name>`: предпочтение Pydantic v2 над marshmallow».
3. Факт уходит в OpenMemory через `add`.
4. mem0 ищет похожие факты в базе. Находит «Проект `<name>`: используется marshmallow для валидации» (старый).
5. Применяет операцию **UPDATE/DELETE+ADD** → старый факт уходит, новый встаёт.
6. **Следующая сессия** в том же `cwd` → SessionStart хук → `search` по имени проекта → свежий факт о Pydantic v2 инжектится в контекст.
7. Когда Claude будет писать новый код в этом проекте, он **уже знает** про Pydantic v2 — без вашего напоминания.

То же самое для:
- «Используй Conventional Commits» → одно правило, дальше всегда применяется.
- «Не комментируй очевидное» → одно правило, дальше Claude помнит.
- «Деплой через GitHub Actions, не через скрипты» → одно правило.

Именно так избавляются от «приходится повторять каждый раз».

---

## Что хранить в OpenMemory

### Категории, которые работают

**Личные предпочтения по разработке** (10–30 фактов):
- «Предпочитаю Kotlin coroutines над RxJava.»
- «В Python — type hints обязательны, mypy --strict.»
- «Тесты пишу до кода (TDD), но не догматически — UI-код можно после.»
- «Коммиты — Conventional Commits, в нижнем регистре, без эмодзи.»

**Стек и инфраструктура** (по проекту):
- «Проект `payments`: Postgres 16, Kafka 3.7, Java 21, Spring Boot 3.3.»
- «Проект `payments`: используем Liquibase для миграций, не Flyway.»
- «Дев-окружение: Docker Compose в `infra/dev`.»

**Архитектурные решения и их причины**:
- «В `payments` saga через event-sourcing, не stateful coordinator (ADR-2025-04-12).»
- «Отказались от GraphQL — REST + OpenAPI достаточно (ADR-...).»

**Принятые конвенции команды**:
- «Pull request: 1 reviewer обязателен, 2 — желательно.»
- «Перед мержом — squash, история main линейная.»
- «Каждый PR содержит ссылку на Jira-тикет в описании.»

**Чему научились (post-mortems)**:
- «Не использовать `JSONB` в `users` — был инцидент с раздуванием индекса (incident-2024-11-03).»
- «Конкретный gotcha по Kafka: при `acks=all` и `min.insync.replicas=2` остановка одного брокера ⇒ простой.»

### Категории, которые ломают систему

❌ **Не храните длинные тексты.** «Полное описание архитектуры биллинга» — это L3 (Obsidian). В OpenMemory только указатель: «Архитектура биллинга: см. `[[20-areas/systems/billing.md]]`».

❌ **Не храните содержимое файлов.** RAG найдёт его сам.

❌ **Не храните временное.** «Сегодня дебажу баг X» — это сегодняшний контекст, не долгосрочный.

❌ **Не храните противоречивое.** Если новое правило отменяет старое — обновите/удалите старое явно (`openmemory.delete` или замените через `add` — mem0 сделает UPDATE).

### Шаблон правила

Хороший факт в памяти — самодостаточный, короткий, с контекстом:

```
[scope: project|global] [topic] : <правило> (контекст: <почему/откуда>)
```

Примеры:
- `[global] commits: Conventional Commits, lowercase, no emoji (consistent across all repos)`
- `[payments] db: prefer composite PK in event tables (ADR-2025-04-12)`
- `[global] python: type hints required, mypy --strict (cross-team agreement)`

Это парсимо, дедупится, и Claude легко сопоставит scope с текущим cwd.

---

## Setup пошагово

### 0. Предусловия (см. предыдущие гайды)

- Obsidian + Smart Connections настроен, vault индексируется.
- Ollama стоит, есть `qwen2.5:7b` или `qwen2.5:14b` (для Stop-хука).
- `jq`, `curl`, `bash` (на macOS — есть из коробки).

### 1. Поднять OpenMemory локально

```bash
git clone https://github.com/CaviraOSS/OpenMemory.git ~/tools/openmemory
cd ~/tools/openmemory
docker compose up -d
# проверка:
curl http://localhost:8765/api/health
```

### 2. Поставить smart-connections-mcp

```bash
git clone https://github.com/dan6684/smart-connections-mcp.git ~/tools/smart-connections-mcp
cd ~/tools/smart-connections-mcp
npm install
# или uv sync, в зависимости от языка проекта — смотрите README
```

### 3. Подключить оба MCP к Claude Code

```bash
claude mcp add openmemory \
  --scope user \
  --command "npx" \
  --args "-y" "@openmemory/mcp" \
  --env "OPENMEMORY_URL=http://localhost:8765"

claude mcp add smart-connections \
  --scope user \
  --command "node" \
  --args "/Users/USER/tools/smart-connections-mcp/dist/index.js" \
  --env "OBSIDIAN_VAULT_PATH=/Users/USER/Notes/MyVault"

claude mcp list
claude mcp doctor openmemory
claude mcp doctor smart-connections
```

### 4. Положить хуки

```bash
mkdir -p ~/.claude/hooks
# скопируйте содержимое 4 хуков выше в:
#   ~/.claude/hooks/session-start.sh
#   ~/.claude/hooks/prompt-classify.sh
#   ~/.claude/hooks/distil-and-save.sh
#   ~/.claude/hooks/save-before-compact.sh
chmod +x ~/.claude/hooks/*.sh
```

### 5. Прописать хуки в settings.json

См. JSON выше — кладите в `~/.claude/settings.json`.

### 6. Создать глобальный CLAUDE.md

Скопируйте шаблон выше в `~/.claude/CLAUDE.md`. Адаптируйте под себя.

### 7. Проверка end-to-end

```bash
# Запустите Claude Code в каком-нибудь рабочем проекте:
cd ~/projects/payments
claude

# В чате:
> Какие у меня предпочтения по коммитам?
# → Должен вызвать openmemory.search и ответить со ссылкой на правило.

> Что я писал про saga pattern?
# → Должен вызвать smart-connections.semantic_search и вернуть ссылки [[...]].

> Запомни: в этом проекте используем Pydantic v2 вместо marshmallow.
# → Stop хук распарсит и положит в OpenMemory.

# Закройте сессию, откройте снова:
> Какой стек в этом проекте?
# → SessionStart хук уже инжектил факты, Claude помнит про Pydantic v2.
```

Если все три проверки прошли — система работает.

---

## Триггеры обновления

«Автоматически» в архитектуре означает:

| Триггер | Что происходит | Кто инициирует |
|---|---|---|
| Открытие сессии Claude | SessionStart хук → загрузка релевантных фактов и недавнего контекста | Claude Code |
| Каждый user prompt | UserPromptSubmit хук → подсказки по выбору MCP | Claude Code |
| Изменение файла в vault | Smart Connections переиндексирует измененный файл | Smart Connections плагин |
| Завершение ответа Claude | Stop хук → извлечение фактов → запись в OpenMemory | Claude Code |
| `/compact` | PreCompact хук → саммари сессии в OpenMemory | Claude Code |
| Ручной `/remember <текст>` | Slash-команда → `openmemory.add` | Вы |

Всё остальное обновляется как побочный эффект:

- Когда вы пишете заметку в Obsidian → плагин сам её эмбеддит.
- Когда Claude правит код через `Edit` → можно повесить PostToolUse хук, который добавит запись в OpenMemory типа «изменения в `<file>`: <короткий summary>».

### Опциональный PostToolUse для самоотчётов

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/log-edit.sh"
          }
        ]
      }
    ]
  }
}
```

`log-edit.sh` — может, например, дописывать в дневник изменений в Obsidian (в `70-daily/<today>.md`). Тогда Claude через RAG сможет узнать, **что он сам делал вчера**.

---

## Антипаттерны

1. **Слишком навязчивый Stop-хук.** Если каждый ответ → запись в память → через неделю в OpenMemory будут тысячи мусорных «фактов» вроде «пользователь спросил Х». Решение: в `distil-and-save.sh` строгий промпт — извлекать **только** долгосрочно полезное, иначе пустая строка.

2. **Дублирование между OpenMemory и CLAUDE.md.** Если правило одно и то же в двух местах, рано или поздно они разойдутся. Договоритесь: «инвариантные глобальные правила → CLAUDE.md, всё развивающееся → OpenMemory».

3. **Использование OpenMemory как RAG.** Не запихивайте туда содержимое заметок. Это убьёт качество семантического поиска (тысячи нерелевантных фрагментов).

4. **Хуки без таймаутов.** Если ваш `distil-and-save.sh` повиснет на запросе к Ollama — Claude Code будет ждать. Добавьте `timeout 5s curl ...` или вообще запускайте обработку в background (`&`).

5. **CLAUDE.md размером 5000 строк.** Документация говорит: «загружается полностью, но короче — лучше адаптируется». 200–500 строк — норма, дальше — выносите детали в vault и оставляйте ссылки.

6. **Запись в OpenMemory без скопа.** Без `[scope: project|global]` или тега факты будут «всплывать» в нерелевантных проектах. Всегда проставляйте scope.

7. **Игнорирование UPDATE/DELETE.** mem0 делает их сам, но если вы вручную добавляете противоречивые факты — система начнёт галлюцинировать. Чините руками: `openmemory.delete <id>`.

8. **Хуки на критическом пути без отказоустойчивости.** SessionStart хук должен иметь `set -e || true` и выходить успешно даже если OpenMemory упал. Иначе вы не сможете запустить Claude вообще.

---

## Источники

### Документация и официальное

- [How Claude remembers your project — Claude Code Docs (memory)](https://code.claude.com/docs/en/memory)
- [Automate workflows with hooks — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
- [mem0 docs — Claude Code integration](https://docs.mem0.ai/integrations/claude-code)
- [Add Persistent Memory to Claude Code with Mem0 (5-min setup)](https://mem0.ai/blog/claude-code-memory)
- [How Memory Works in Claude Code (mem0 blog)](https://mem0.ai/blog/how-memory-works-in-claude-code)

### Готовые open-source решения

- [smart-connections-mcp (dan6684)](https://github.com/dan6684/smart-connections-mcp) — MCP-обёртка над Smart Connections.
- [obsidian-smart-connections (brianpetro)](https://github.com/brianpetro/obsidian-smart-connections) — сам плагин (4700+ stars).
- [OpenMemory (CaviraOSS)](https://github.com/CaviraOSS/OpenMemory) — self-hosted локальный memory store с MCP.
- [claude-hooks (mann1x)](https://github.com/mann1x/claude-hooks) — production-grade хуки для memory recall с Qdrant + KG.
- [claude-mem (thedotmack)](https://github.com/thedotmack/claude-mem) — auto-capture сессии с компрессией.
- [obsidian-mcp-tools (jacksteamdev)](https://github.com/jacksteamdev/obsidian-mcp-tools) — semantic search + custom Templater prompts через MCP.

### Полезные статьи

- [Obsidian + Claude Code: The Complete Integration Guide (Starmorph)](https://blog.starmorph.com/blog/obsidian-claude-code-integration-guide)
- [Obsidian + AI: From Simple Plugin to Full Agent Integration (3sztof)](https://3sztof.github.io/posts/obsidian-smart-connections-mcp/)
- [Claude Code Memory System Explained: 4 Layers, 5 Limits, and a Fix (Milvus)](https://milvus.io/blog/claude-code-memory-memsearch.md)
- [Claude Code Hooks: Complete Guide (March 2026)](https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/)
- [Embedding Memory into Claude Code: From Session Loss to Persistent Context](https://dev.to/shimo4228/embedding-memory-into-claude-code-from-session-loss-to-persistent-context-54d8)
- [How to give Claude Code persistent memory with self-hosted mem0 MCP](https://dev.to/n3rdh4ck3r/how-to-give-claude-code-persistent-memory-with-a-self-hosted-mem0-mcp-server-h68)
- [Building an AI Second Brain that Evolves Over Time (MindStudio)](https://www.mindstudio.ai/blog/ai-second-brain-claude-code-obsidian-architecture)

---

## Чек-лист «память Claude настроена»

- [ ] Smart Connections в Obsidian работает, `.smart-env/` есть в vault'е.
- [ ] OpenMemory поднят локально (Docker), `/api/health` отвечает.
- [ ] `smart-connections-mcp` подключён к Claude Code (`claude mcp list` показывает).
- [ ] `openmemory` MCP подключён к Claude Code.
- [ ] `~/.claude/CLAUDE.md` содержит протокол использования памяти.
- [ ] Хуки SessionStart, UserPromptSubmit, Stop, PreCompact лежат и исполняемые.
- [ ] `~/.claude/settings.json` ссылается на хуки.
- [ ] Тестовый запрос «какие у меня предпочтения по коммитам» возвращает ответ из памяти.
- [ ] Тестовый запрос «что я писал про X» возвращает ссылки `[[...]]` из vault.
- [ ] После «запомни Y» — следующая сессия знает Y без напоминания.
- [ ] PreCompact хук тестирован на длинной сессии (триггерится `/compact`).

После этого — у вас полноценная долгосрочная память, которая работает сама.
