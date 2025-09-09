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

1. Установите переменную окружения `VANESSA_AUTOMATION_PATH` с путем к исполняемому файлу Vanessa Automation:
```bash
export VANESSA_AUTOMATION_PATH="/path/to/vanessa-automation.exe"
```

2. Добавьте сервер в конфигурацию Claude Desktop:

### Windows
Откройте файл `%APPDATA%\Claude\claude_desktop_config.json` и добавьте:

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

### macOS/Linux
Откройте файл `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) или `~/.config/Claude/claude_desktop_config.json` (Linux) и добавьте:

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