# Vanessa Automation MCP Server

MCP (Model Context Protocol) сервер для интеграции Vanessa Automation с AI-агентами.

## Описание

Этот MCP сервер позволяет AI-агентам (например, Claude) взаимодействовать с Vanessa Automation - BDD фреймворком для тестирования 1C приложений.

## Возможности

### Базовые функции
- **run_scenario** - Запуск BDD сценариев через Vanessa Automation
- **create_feature** - Создание новых feature файлов с Gherkin сценариями
- **parse_feature** - Парсинг и валидация Gherkin feature файлов
- **generate_steps** - Генерация шаблонов шагов для feature файлов

### UI автоматизация
- **explore_form** - Исследование структуры форм 1С и доступных элементов
- **get_elements** - Получение списка UI элементов текущей формы (кнопки, поля, таблицы)
- **perform_action** - Выполнение действий с элементами (клик, ввод текста, выбор значений)
- **get_standard_steps** - Получение списка стандартных шагов VA для UI автоматизации

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/vanessa-mcp.git
cd vanessa-mcp
```

2. Установите зависимости:
```bash
npm install
```

3. Соберите проект:
```bash
npm run build
```

## Настройка

### Переменная окружения

Установите переменную окружения `VANESSA_AUTOMATION_PATH` с путем к исполняемому файлу Vanessa Automation:
```bash
export VANESSA_AUTOMATION_PATH="/path/to/vanessa-automation.exe"
```

### Claude Desktop

#### Windows
Откройте файл `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vanessa-automation": {
      "command": "node",
      "args": ["C:\\path\\to\\vanessa-mcp\\dist\\index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
      }
    }
  }
}
```

#### macOS/Linux
Откройте файл `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) или `~/.config/Claude/claude_desktop_config.json` (Linux):

```json
{
  "mcpServers": {
    "vanessa-automation": {
      "command": "node",
      "args": ["/path/to/vanessa-mcp/dist/index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "/path/to/vanessa-automation"
      }
    }
  }
}
```

### Cursor

Добавьте в настройки Cursor (`.cursor/mcp_settings.json` в корне проекта или глобально в `~/.cursor/mcp_settings.json`):

```json
{
  "mcpServers": {
    "vanessa-automation": {
      "command": "node",
      "args": ["./vanessa-mcp/dist/index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
      },
      "enabled": true
    }
  }
}
```

### Cherry Studio

В Cherry Studio откройте Settings → MCP Servers и добавьте новый сервер:

```json
{
  "name": "vanessa-automation",
  "command": "node",
  "args": ["C:\\path\\to\\vanessa-mcp\\dist\\index.js"],
  "env": {
    "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
  },
  "autoStart": true
}
```

Или через файл конфигурации `~/.cherry-studio/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "vanessa-automation",
      "command": "node",
      "args": ["C:\\path\\to\\vanessa-mcp\\dist\\index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
      }
    }
  ]
}
```

### Cline (VS Code Extension)

Добавьте в настройки VS Code (settings.json):

```json
{
  "cline.mcpServers": {
    "vanessa-automation": {
      "command": "node",
      "args": ["${workspaceFolder}/vanessa-mcp/dist/index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
      }
    }
  }
}
```

Или через UI: 
1. Откройте Command Palette (Ctrl+Shift+P)
2. Выберите "Cline: Configure MCP Servers"
3. Добавьте сервер с параметрами выше

### Roo-Cline (VS Code Fork)

Для Roo-Cline (форк Cline) настройка аналогична Cline. Добавьте в settings.json:

```json
{
  "roo-cline.mcpServers": [
    {
      "name": "vanessa-automation",
      "command": "node",
      "args": ["${workspaceFolder}/vanessa-mcp/dist/index.js"],
      "env": {
        "VANESSA_AUTOMATION_PATH": "C:\\path\\to\\vanessa-automation.exe"
      },
      "enabled": true
    }
  ]
}
```

Или через UI:
1. Откройте настройки Roo-Cline в боковой панели
2. Перейдите в раздел "MCP Servers"
3. Нажмите "Add Server" и введите параметры

### Важные замечания

1. Замените `C:\\path\\to\\vanessa-mcp` на реальный путь к установленному MCP серверу
2. Замените `C:\\path\\to\\vanessa-automation.exe` на путь к вашей установке Vanessa Automation
3. Для macOS/Linux используйте соответствующие пути без расширения .exe
4. После изменения конфигурации перезапустите IDE/редактор

## Использование

После настройки, Claude сможет использовать инструменты Vanessa Automation. Примеры:

### Создание feature файла:
"Создай feature файл для тестирования авторизации в 1C"

### Запуск сценариев:
"Запусти BDD сценарии из файла tests/login.feature"

### Генерация шагов:
"Сгенерируй шаблоны шагов для feature файла tests/catalog.feature"

## Разработка

Для запуска в режиме разработки:
```bash
npm run dev
```

## Структура проекта

```
vanessa-mcp/
├── src/
│   └── index.ts       # Основной файл сервера
├── dist/              # Скомпилированные файлы
├── package.json       # Конфигурация npm
├── tsconfig.json      # Конфигурация TypeScript
└── README.md          # Документация
```

## Требования

- Node.js 16+
- Vanessa Automation установленный на системе
- Claude Desktop с поддержкой MCP

## Лицензия

ISC