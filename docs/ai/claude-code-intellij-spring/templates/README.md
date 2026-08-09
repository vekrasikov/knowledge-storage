# Шаблоны

Готовые к копированию файлы к гайду [`../README.md`](../README.md).

## Раскладка в проекте

```
<ваш-spring-проект>/
├── CLAUDE.md                        ← templates/CLAUDE.md
├── .mcp.json                        ← templates/.mcp.json   (коммитится, scope: project)
└── .claude/
    ├── settings.json                ← templates/settings.json
    ├── hooks/
    │   ├── java-change-gate.sh      ← templates/hooks/
    │   ├── check-ide.sh
    │   ├── final-check.sh
    │   └── inject-env.sh
    ├── skills/
    │   ├── ide-context/SKILL.md     ← templates/skills/
    │   └── spring-change-gate/SKILL.md
    └── agents/
        └── spring-explorer.md       ← templates/agents/
```

## Установка

```bash
cd <ваш-spring-проект>
mkdir -p .claude/hooks .claude/skills .claude/agents

cp <этот-репо>/docs/ai/claude-code-intellij-spring/templates/CLAUDE.md      ./CLAUDE.md
cp <этот-репо>/docs/ai/claude-code-intellij-spring/templates/.mcp.json      ./.mcp.json
cp <этот-репо>/docs/ai/claude-code-intellij-spring/templates/settings.json  ./.claude/settings.json
cp -r <этот-репо>/docs/ai/claude-code-intellij-spring/templates/hooks/*     ./.claude/hooks/
cp -r <этот-репо>/docs/ai/claude-code-intellij-spring/templates/skills/*    ./.claude/skills/
cp -r <этот-репо>/docs/ai/claude-code-intellij-spring/templates/agents/*    ./.claude/agents/

chmod +x .claude/hooks/*.sh
```

## Обязательно поправить руками

1. **`.mcp.json` → `jetbrains.command`** — заглушка. Реальное значение:
   IDEA → Settings → Tools → MCP Server → Enable → **Copy Stdio Config**.
2. **`settings.json` → имена MCP-инструментов** (`mcp__jetbrains__*`, `mcp__amplicode__*`).
   Они зависят от ключа сервера в `.mcp.json`. Подключитесь, выполните `/mcp`
   и выпишите фактические имена.
3. **`CLAUDE.md`** — весь раздел «Проект» и команды под ваш стек (Gradle/Maven,
   spotless/checkstyle, имена модулей).
4. **`hooks/final-check.sh`** — эвристика подбора тестов по имени. Под ваши конвенции
   именования её почти наверняка надо поправить.

## Проверка, что hooks работают

```bash
# синтаксис
bash -n .claude/hooks/*.sh

# ручной прогон java-change-gate
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/main/java/com/acme/Foo.java"}}' \
  | .claude/hooks/java-change-gate.sh; echo "exit=$?"
```

Затем в Claude Code: `/hooks` — покажет зарегистрированные хуки; сделайте заведомо
некомпилирующуюся правку и убедитесь, что Клод узнал об этом сам.

## Зависимости

- `bash`, `git`, `python3` (только для корректного JSON-экранирования в хуках).
- Если `python3` в вашей среде нет — замените вызовы на `jq -Rs .`.

## Порядок внедрения

Не ставьте всё сразу. Порядок из гайда: сначала `CLAUDE.md` + `java-change-gate.sh`
(уровень 0), убедитесь в эффекте, потом IDE (уровень 1), потом MCP (уровень 2).
Иначе не поймёте, что именно сработало, а что добавило шума.
