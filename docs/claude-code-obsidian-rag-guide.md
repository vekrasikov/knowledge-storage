# Локальная база знаний: Claude Code + Obsidian + RAG (Mac M1)

Полный практический гайд: как поднять локальную векторную базу знаний поверх Obsidian-vault, чтобы Claude Code в CLI и в чат-UI отвечал по вашим заметкам, PDF и Confluence — без облака, без утечек, на M1.

Ориентир по объёму: ~1 500 markdown-заметок + ~100 PDF. Всё ниже работает на 16 ГБ M1, но 32 ГБ дают комфорт.

---

## Содержание

1. [Архитектура решения](#архитектура-решения)
2. [Что нужно установить](#что-нужно-установить)
3. [Шаг 1. Obsidian vault и его структура](#шаг-1-obsidian-vault-и-его-структура)
4. [Шаг 2. Ollama и локальные модели](#шаг-2-ollama-и-локальные-модели)
5. [Шаг 3. Выбор MCP-моста к Obsidian](#шаг-3-выбор-mcp-моста-к-obsidian)
6. [Шаг 4. Подключение MCP к Claude Code](#шаг-4-подключение-mcp-к-claude-code)
7. [Шаг 5. Загрузка PDF в индекс](#шаг-5-загрузка-pdf-в-индекс)
8. [Шаг 6. Confluence через Atlassian MCP](#шаг-6-confluence-через-atlassian-mcp)
9. [Шаг 7. Первые рабочие сценарии](#шаг-7-первые-рабочие-сценарии)
10. [Тюнинг качества RAG](#тюнинг-качества-rag)
11. [Опционально: долгосрочная память (mem0/OpenMemory)](#опционально-долгосрочная-память-mem0openmemory)
12. [Эксплуатация: бэкапы, переиндексация, обновления](#эксплуатация)
13. [Траблшутинг](#траблшутинг)
14. [Что НЕ делать](#что-не-делать)

---

## Архитектура решения

```
┌──────────────────────────────────────────────────────────────┐
│  Claude Code (CLI + chat UI)                                 │
│  ───────────────────────────                                 │
│  читает MCP-инструменты, вызывает их по запросу пользователя │
└────────────────┬─────────────────────────────────────────────┘
                 │ MCP (stdio / WebSocket / HTTP-SSE)
   ┌─────────────┼──────────────────────────────┐
   ▼             ▼                              ▼
┌────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ Obsidian│  │ Atlassian MCP    │  │ (опц.) OpenMemory MCP   │
│ MCP     │  │ (готовый)        │  │ долгосрочная память     │
│ + RAG   │  │ Confluence/Jira  │  │ агента                  │
└───┬────┘  └──────────────────┘  └──────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Локальный RAG-пайплайн              │
│  ┌──────────┐   ┌────────────────┐  │
│  │ Ingest   │──▶│ Chunker        │  │
│  │ .md/.pdf │   │ ~512–800 ток.  │  │
│  └──────────┘   └────────┬───────┘  │
│                          ▼          │
│                ┌──────────────────┐ │
│                │ Embeddings       │ │
│                │ Ollama           │ │
│                │ nomic-embed-text │ │
│                └────────┬─────────┘ │
│                         ▼           │
│                ┌──────────────────┐ │
│                │ Vector store     │ │
│                │ Chroma / LanceDB │ │
│                └────────┬─────────┘ │
│                         ▼           │
│                ┌──────────────────┐ │
│                │ Hybrid retrieval │ │
│                │ vec + BM25       │ │
│                │ (+ reranker)     │ │
│                └──────────────────┘ │
└─────────────────────────────────────┘
         ▲
         │
┌────────┴─────────┐
│ Obsidian vault   │
│ ~/Notes/MyVault  │
│  ├ daily/        │
│  ├ areas/        │
│  ├ projects/     │
│  └ pdfs/         │
└──────────────────┘
```

Ключевые принципы:

- **Один источник правды — vault.** PDF тоже лежат внутри vault, RAG индексирует всё одним проходом.
- **Локально всё.** Эмбеддинги — через Ollama, векторное хранилище — на диске, ничего не уходит в облако.
- **Конфлюенс отдельно.** Не копируем его в vault, ходим напрямую через готовый Atlassian MCP — он уже умеет CQL-поиск.
- **Claude Code — клиент.** Он не индексирует сам, а вызывает MCP-инструменты, которые уже умеют поиск.

---

## Что нужно установить

| Компонент | Зачем | Команда |
|---|---|---|
| Homebrew | Пакетный менеджер | стандарт |
| Obsidian.app | Хранилище заметок | `brew install --cask obsidian` |
| Ollama | LLM + эмбеддинги локально | `brew install ollama` |
| Node.js 20+ | Многие MCP-серверы — на JS | `brew install node` |
| Python 3.11+ | Часть MCP-серверов — на Python | `brew install python@3.11 uv` |
| Claude Code | CLI-клиент | `npm i -g @anthropic-ai/claude-code` |

Проверка:

```bash
ollama --version
node --version    # >= 20
python3 --version # >= 3.11
claude --version
```

---

## Шаг 1. Obsidian vault и его структура

### Создание vault

1. Откройте Obsidian → `Create new vault` → выберите путь, например `~/Notes/MyVault`.
2. В `Settings → Files & Links`:
   - `Default location for new attachments`: `In subfolder under current folder`, имя `attachments`.
   - `Use [[Wikilinks]]`: ON (для лучшего парсинга связей RAG-ом).
   - `New link format`: `Relative path to file`.
3. В `Settings → Editor`: `Strict line breaks` — OFF (стандарт markdown).

### Структура (PARA + один inbox)

```
MyVault/
├── 00-inbox/         # сюда падает всё новое; раз в неделю разбираете
├── 10-projects/      # активные проекты (с дедлайном)
├── 20-areas/         # зоны ответственности (без дедлайна, длительные)
├── 30-resources/     # справочники, шпаргалки, статьи
├── 40-archive/       # завершённое и неактуальное
├── 50-pdfs/          # PDF-файлы; индексируются вместе с заметками
├── 90-templates/     # шаблоны Templater (см. второй гайд)
└── _meta/            # README vault'а, индекс ссылок, MOC
```

Почему именно так:

- Числовые префиксы дают предсказуемый порядок в файловом дереве и алфавитном поиске.
- Inbox — обязателен, иначе система разваливается через 2 недели (классическая ловушка).
- PDF в отдельной папке, чтобы при необходимости исключить их из индекса (есть кейсы, когда хочется только заметки).

### Что положить в vault на старте

- Существующие markdown-заметки → в `30-resources/` или `20-areas/` по смыслу.
- 100 PDF → в `50-pdfs/`. Имена файлов лучше переименовать в человекочитаемый вид: `2024-author-paper-title.pdf`.
- README в корне vault: коротко описывает что где лежит — это даст RAG-у «карту территории» при первом запросе.

---

## Шаг 2. Ollama и локальные модели

### Запуск службы

```bash
brew services start ollama
# проверка
curl http://localhost:11434/api/tags
```

### Какие модели тянуть

```bash
# Эмбеддинги (обязательно)
ollama pull nomic-embed-text          # 274 МБ, 768 dim, лучший баланс качество/скорость для RU+EN
# Альтернатива побольше и поточнее:
ollama pull mxbai-embed-large          # 670 МБ, 1024 dim

# Чат-модель (выбрать одну под вашу память)
# 16 ГБ RAM:
ollama pull qwen2.5:7b                 # быстро, отлично с русским
ollama pull llama3.1:8b                # классика, хорошо инструкции

# 32 ГБ RAM:
ollama pull qwen2.5:14b                # рекомендую как дефолт
ollama pull qwen2.5:32b-instruct-q4_K_M # тяжёлая, но качественная
```

Заметка: для RAG-ответов чат-модель Ollama нужна **только если вы хотите задавать вопросы локальной модели**. Если основной интерфейс — Claude Code (т.е. вопросы задаёт сам Claude), то локальная чат-модель не критична — нужны только эмбеддинги. Но удобно иметь её для оффлайна.

### Реранкер (опционально, но сильно повышает точность)

Реранкер работает не через Ollama, а через Python-сервис в составе MCP. Будет ниже.

---

## Шаг 3. Выбор MCP-моста к Obsidian

Есть три апробированных пути. Выбираем один.

### Вариант A. **Obsidian Local REST API + mcp-obsidian** — самый стабильный

**Когда брать:** хотите простоту, классический CRUD по vault'у, не нужна продвинутая семантика (или вас устраивает то, что делает Smart Connections отдельно).

Установка:

1. В Obsidian: `Settings → Community plugins → Browse → "Local REST API"` → Install → Enable.
2. В настройках плагина: `Enable encrypted server`: ON, скопируйте API key.
3. Установить MCP-сервер:

   ```bash
   uvx mcp-obsidian --help    # проверка, что доступен
   # либо через npm:
   npm i -g obsidian-mcp
   ```

4. В Claude Code прописать MCP (см. Шаг 4).

Плюсы: zero-config с Claude Code, всё через REST API.
Минусы: ретривал — keyword/path, без векторного поиска. Подходит, когда seman­tic search вы делаете отдельно (Smart Connections).

### Вариант B. **Obsidian Intelligence** — полноценный локальный RAG, проще всего

**Когда брать:** хотите векторный + keyword поиск из коробки, без возни. Это золотая середина.

Установка:

```bash
git clone https://github.com/GuideThomas/obsidian-intelligence
cd obsidian-intelligence
uv sync           # или pip install -e .
```

Конфиг (`config.toml` или ENV):

```toml
vault_path = "/Users/USER/Notes/MyVault"
embedding_provider = "ollama"
embedding_model = "nomic-embed-text"
ollama_base_url = "http://localhost:11434"
vector_store = "lancedb"             # лежит на диске, в папке проекта
chunk_size = 800
chunk_overlap = 120
include_globs = ["**/*.md", "50-pdfs/**/*.pdf"]
exclude_globs = ["00-inbox/**", ".obsidian/**", ".trash/**"]
```

Первичная индексация:

```bash
uv run obsidian-intelligence index
# выведет: indexed 1500 notes, 100 PDFs, ~32k chunks in 4m12s
```

Запуск как MCP:

```bash
uv run obsidian-intelligence mcp
# слушает stdio
```

Плюсы: гибридный поиск (vec + BM25), Ollama-эмбеддинги, работает с PDF из коробки, полностью локально.
Минусы: ставить вручную, требует Python.

### Вариант C. **Obsidian Agentic RAG** — максимум качества

**Когда брать:** база знаний — это серьёзный рабочий инструмент, важна точность ответов на сложные вопросы.

Отличается тем, что добавляет cross-encoder reranker (`bge-reranker-v2-m3`) поверх гибридного поиска и экспонирует 7 специализированных MCP-инструментов: семантический поиск, поиск по тегам, по бэклинкам, по датам, и т.д.

Установка аналогична B, но добавляется reranker:

```bash
# Через тот же uv:
uv sync --extra reranker
# первый запуск скачает модель ~ 600 МБ
```

Плюсы: ощутимо точнее на сложных запросах, особенно когда в vault'е перекрывающиеся темы.
Минусы: первый ответ медленнее на ~300–800 мс из-за реранкинга, расход RAM ~1.5 ГБ на reranker.

### Что выбрать

| Вы | Рекомендация |
|---|---|
| Хотите быстро попробовать, vault < 500 заметок | A |
| 1 500 заметок + PDF, нужен качественный поиск из коробки | **B (рекомендую вам)** |
| База знаний — критичный рабочий инструмент, готовы к настройке | C |

---

## Шаг 4. Подключение MCP к Claude Code

### Где конфиг

Claude Code читает MCP-конфиг из:

- Глобально: `~/.claude.json` (раздел `mcpServers`).
- На проект: `.mcp.json` в корне проекта (берёт приоритет).
- Через CLI: `claude mcp add` (записывает в глобальный).

### Конфиг для Варианта B (Obsidian Intelligence)

Через CLI (быстрее):

```bash
claude mcp add obsidian \
  --scope user \
  --command "uv" \
  --args "run" "--project" "/Users/USER/tools/obsidian-intelligence" \
         "obsidian-intelligence" "mcp" \
  --env "OLLAMA_BASE_URL=http://localhost:11434"
```

Или вручную в `~/.claude.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uv",
      "args": [
        "run", "--project", "/Users/USER/tools/obsidian-intelligence",
        "obsidian-intelligence", "mcp"
      ],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    },
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-atlassian"],
      "env": {
        "ATLASSIAN_DOMAIN": "yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL": "you@example.com",
        "ATLASSIAN_API_TOKEN": "<token>"
      }
    }
  }
}
```

### Проверка

```bash
claude mcp list                    # должен показать "obsidian" и "atlassian"
claude mcp doctor obsidian         # проверит соединение и инструменты
```

В Claude Code (CLI):

```
> /mcp
```

— должен показать список MCP-серверов и их инструментов. Если не видны — смотрите `~/Library/Logs/Claude/mcp.log`.

---

## Шаг 5. Загрузка PDF в индекс

### Способ 1: положить PDF в vault (рекомендую)

Просто скопируйте файлы в `50-pdfs/`. При следующем запуске `obsidian-intelligence index` они подхватятся.

```bash
cp ~/Downloads/*.pdf ~/Notes/MyVault/50-pdfs/
uv run obsidian-intelligence index --incremental
```

### Что внутри происходит

- PDF парсится через `pypdf` или `pymupdf` (зависит от MCP).
- Текст разбивается на чанки по 800 токенов с overlap 120.
- Каждый чанк → вектор через `nomic-embed-text` → запись в LanceDB с метаданными `{file_path, page, mtime, tags}`.

### Сканы и PDF без текстового слоя

Если у вас сканированные PDF (нет копируемого текста), нужен OCR. Самый простой путь:

```bash
brew install ocrmypdf
ocrmypdf -l rus+eng input.pdf output.pdf
mv output.pdf ~/Notes/MyVault/50-pdfs/
```

После этого индексируйте обычным образом.

---

## Шаг 6. Confluence через Atlassian MCP

Atlassian MCP уже официальный (`@modelcontextprotocol/server-atlassian` или `mcp-remote https://mcp.atlassian.com/v1/sse`). Конфиг — в Шаге 4 выше.

### Получение API-токена

1. https://id.atlassian.com/manage-profile/security/api-tokens → Create API token.
2. Сохраните в keychain или менеджере паролей.

### Что доступно в Claude Code

После `/mcp` появляются инструменты:

- `getConfluencePage` — по ID/URL.
- `searchConfluenceUsingCql` — CQL-запросы (`text ~ "kafka" AND space = ENG`).
- `getPagesInConfluenceSpace` — листинг пространства.
- `getJiraIssue`, `searchJiraIssuesUsingJql` — для Jira (бонус).

Confluence не индексируется локально, Claude Code обращается к нему по запросу. Это нормально: страницы Confluence обычно меньше vault'а и редко нужны массово.

### Когда стоит копировать Confluence в vault

Только если:

- вам нужен оффлайн-доступ;
- хотите, чтобы Confluence-страницы участвовали в семантическом поиске вместе с заметками;
- стабильность сети — проблема.

В этом случае ставьте плагин `Confluence to Obsidian` или скрипт-синхронизатор и кладите `.md` в `30-resources/confluence/`. Но это лишний слой синхронизации, который ломается, — стартуйте без него.

---

## Шаг 7. Первые рабочие сценарии

После установки запустите Claude Code и проверьте, что MCP-инструменты используются.

### Сценарий 1. Поиск по заметкам

```
> Найди в моих заметках всё про "saga pattern" и собери чек-лист реализации.
```

Claude вызовет инструмент `obsidian.search_semantic` или аналогичный, получит топ-K чанков с цитатами и ответит со ссылками вида `[[10-projects/payments-saga]]`.

Что проверить:

- В ответе есть ссылки на конкретные файлы.
- Если ссылок нет — Claude отвечает «из головы», MCP не сработал. Смотрите `/mcp` и логи.

### Сценарий 2. Архитектурное решение по теме

```
> На основе моих заметок и Confluence-пространства ENG предложи архитектуру event-driven биллинга. Цитируй источники.
```

Claude должен сходить и в Obsidian (`semantic_search`), и в Confluence (`searchConfluenceUsingCql`), смерджить и дать ответ с двумя секциями цитат.

### Сценарий 3. Конспект PDF

```
> Прочитай 2024-kleppmann-streaming.pdf и сделай саммари с главными выводами и местами, которые я отметил.
```

Если PDF проиндексирован — Claude вытащит чанки и пройдётся. Если хотите целый файл — попросите `read_file` на путь.

### Сценарий 4. Создание новой заметки

```
> Создай заметку 30-resources/kafka-tuning.md по моему стилю (см. шаблон в 90-templates/zettel.md), наполни её из найденного материала по Kafka tuning.
```

Это уже агентский режим — Claude читает шаблон, создаёт файл, наполняет содержимым со ссылками на источники.

---

## Тюнинг качества RAG

Когда базовая установка работает, но ответы «рядом, но мимо»:

### Чанкинг

Для markdown-заметок:

- Размер чанка: **600–1000 токенов** (для русского — ближе к 800, токены крупнее английских).
- Overlap: **15–20%** (120–160 токенов при чанке 800).
- Бить **по заголовкам** в первую очередь, по абзацам — во вторую. В Obsidian Intelligence/Agentic RAG это включается флагом `markdown_aware_splitter = true`.

Для PDF: те же параметры, но добавьте сохранение метаданных страницы — пригодится для цитат.

### Эмбеддинги

`nomic-embed-text` — отличный дефолт. Если ответы плохо находят русский текст, пробуйте:

- `mxbai-embed-large` — заметно точнее на смешанном RU/EN, но индекс ×1.3 по объёму и медленнее.
- `bge-m3` (через Ollama, если доступна) — лучшее, что есть для мультиязычных задач, но требует больше RAM.

После смены модели **обязательна полная переиндексация** — старые векторы не совместимы.

### Гибридный поиск (vec + BM25)

Включён по умолчанию в Вариантах B и C. Если в вашем MCP только векторный — вы много теряете на запросах с конкретными терминами/именами/кодом. Включайте BM25.

### Реранкер

Если используете Вариант C — он уже включён. Параметры:

- `top_k_initial`: 30–50 (сколько кандидатов отдаёт ретривер).
- `top_k_final`: 5–10 (сколько остаётся после реранка).
- `rerank_model`: `bge-reranker-v2-m3`.

Без реранкера попадаются нерелевантные чанки на сложных вопросах. С реранкером качество ответов на «многошаговые» запросы вырастает заметно.

### Метаданные и фильтры

В метаданных каждого чанка должны быть:

- `path` (для цитат и фильтров),
- `tags` из frontmatter заметки,
- `mtime` (можно фильтровать «только за последний месяц»),
- для PDF — `page`.

Это даёт мощные запросы:

```
> Найди только в проектах (10-projects) что я писал за последние 60 дней про latency.
```

Хорошие MCP такие фильтры экспонируют как параметры инструмента.

---

## Опционально: долгосрочная память (mem0/OpenMemory)

Это **другая задача**, чем RAG. RAG отвечает «что есть в моих документах». Память отвечает «что Claude знает обо мне как о пользователе».

Когда добавлять:

- Хотите, чтобы Claude помнил между сессиями ваши предпочтения, стиль, решения по проектам.
- Не путайте с заменой документной базы — память хранит десятки коротких фактов, не тысячи документов.

Установка OpenMemory MCP:

```bash
git clone https://github.com/CaviraOSS/OpenMemory
cd OpenMemory
docker compose up -d
```

Конфиг в `~/.claude.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@openmemory/mcp"],
      "env": {
        "OPENMEMORY_URL": "http://localhost:8765"
      }
    }
  }
}
```

После этого Claude будет вызывать `memory.add` / `memory.search` сам, когда сочтёт нужным. Можно явно: «запомни, что я предпочитаю Kotlin для бэкенда».

**Не делайте это первым шагом.** Сначала RAG, потом неделя использования, потом — память, если правда нужна.

---

## Эксплуатация

### Переиндексация

- **Инкрементально** (после изменений в vault):
  ```bash
  uv run obsidian-intelligence index --incremental
  ```
  По mtime файлов, занимает секунды-минуты.

- **Полная** (после смены модели эмбеддингов или параметров чанкинга):
  ```bash
  uv run obsidian-intelligence index --rebuild
  ```

### Автоматизация

LaunchAgent для инкрементальной переиндексации каждый час:

`~/Library/LaunchAgents/com.user.obsidian-reindex.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.user.obsidian-reindex</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/uv</string>
    <string>run</string>
    <string>--project</string>
    <string>/Users/USER/tools/obsidian-intelligence</string>
    <string>obsidian-intelligence</string>
    <string>index</string>
    <string>--incremental</string>
  </array>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>/tmp/obsidian-reindex.log</string>
  <key>StandardErrorPath</key><string>/tmp/obsidian-reindex.err</string>
</dict>
</plist>
```

Загрузка:

```bash
launchctl load ~/Library/LaunchAgents/com.user.obsidian-reindex.plist
```

### Бэкапы

Vault — это просто папка markdown. Бэкап = git + iCloud/Dropbox/локальный rsync.

Минимум: `git init` в vault, ежедневный auto-commit (плагин `Obsidian Git`, см. второй гайд).

Векторный индекс — **не бэкапить**. Он перестраивается из vault'а. Бэкап индекса — это скрытый источник дрейфа схем.

### Обновление моделей

```bash
ollama pull nomic-embed-text       # обновит до свежей версии
# после этого:
uv run obsidian-intelligence index --rebuild
```

---

## Траблшутинг

| Симптом | Причина | Решение |
|---|---|---|
| `/mcp` не показывает obsidian | команда из конфига падает | `claude mcp doctor obsidian`, смотрите stderr |
| Claude не использует MCP, отвечает «из головы» | в системном промпте нет триггера | в начале запроса: «используй obsidian search для…» |
| Поиск возвращает старые версии файлов | индекс не обновлён | `index --incremental` или включите LaunchAgent |
| OOM при индексации больших PDF | дефолтный батч слишком большой | `embedding_batch_size = 8` (с 32) |
| Медленные ответы (5+ сек) | реранкер на CPU | проверьте, что Metal активен (`OLLAMA_NUM_GPU=1`) |
| Ollama «забивает» 16 ГБ ОЗУ | две модели в памяти | `ollama ps`, выгрузите чат-модель: `ollama stop qwen2.5:14b` |
| MCP «отваливается» | Claude Code тайм-аутит на холодном запуске | в конфиге `"startupTimeout": 30000` |
| Confluence MCP падает 401 | API-токен протух или нет доступа в space | пересоздать токен на id.atlassian.com |

Логи:

- Claude Code: `~/Library/Logs/Claude/`
- Ollama: `~/.ollama/logs/server.log`
- Obsidian Intelligence: `~/Library/Logs/obsidian-intelligence/`

---

## Что НЕ делать

- **Не дублировать инструменты.** Один Obsidian-MCP, один Confluence-MCP. Если поставите два разных obsidian-MCP, Claude будет рандомно выбирать — и качество поползёт.
- **Не индексировать `.obsidian/` и `.trash/`.** Это служебные папки, в них мусор для RAG.
- **Не пытаться «улучшить» через цепочку RAG → второй RAG → агент.** Сначала простой ретривал + цитаты. Сложные пайплайны имеют смысл, когда базовый явно упирается.
- **Не хранить секреты в vault.** Любой MCP с правом read будет их видеть. Для секретов — отдельный keychain-flow.
- **Не отдавать MCP право `write` без обдумывания.** Claude может «улучшать» ваши заметки. Сначала read-only, через 1-2 недели включайте write на конкретных папках.
- **Не подменять RAG на mem0/OpenMemory.** Это разные классы инструментов (документы vs. факты о пользователе).

---

## Чек-лист «всё готово»

- [ ] Vault создан, заметки разложены по PARA, в нём есть README.
- [ ] Ollama запущена, `nomic-embed-text` подтянут.
- [ ] MCP (Obsidian Intelligence или другой) запускается из CLI, индекс построен.
- [ ] Claude Code видит `obsidian` и `atlassian` в `/mcp`.
- [ ] Тестовый запрос «найди в заметках X» возвращает ответ со ссылками `[[...]]`.
- [ ] LaunchAgent для инкрементальной переиндексации настроен (или переиндексация делается вручную раз в день).
- [ ] Vault под git, коммиты идут (плагин Obsidian Git).
- [ ] (Опционально) OpenMemory подключён для долгосрочной памяти.

После этого база знаний — рабочий инструмент. Дальнейшее — наполнять её и подкручивать чанкинг/реранкинг под ваши вопросы.
