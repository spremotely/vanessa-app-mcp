#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const RunScenarioSchema = z.object({
  featurePath: z.string().describe('Path to the feature file with Gherkin scenarios'),
  configPath: z.string().optional().describe('Path to VA configuration file'),
  additionalParams: z.string().optional().describe('Additional command line parameters'),
});

const CreateFeatureSchema = z.object({
  filePath: z.string().describe('Path where to save the feature file'),
  content: z.string().describe('Gherkin content of the feature file'),
});

const ParseFeatureSchema = z.object({
  featurePath: z.string().describe('Path to the feature file to parse'),
});

const GenerateStepsSchema = z.object({
  featurePath: z.string().describe('Path to the feature file'),
  outputPath: z.string().optional().describe('Path for generated step definitions'),
});

const ExploreFormSchema = z.object({
  formName: z.string().describe('Name or title of the 1C form to explore'),
  depth: z.number().optional().default(2).describe('Depth of element exploration'),
});

const GetElementsSchema = z.object({
  elementType: z.string().optional().describe('Type of elements to get (button, field, table, etc.)'),
  parentElement: z.string().optional().describe('Parent element to search within'),
});

const PerformActionSchema = z.object({
  action: z.enum(['click', 'input', 'select', 'check', 'doubleclick', 'rightclick']).describe('Action to perform'),
  element: z.string().describe('Element identifier or path'),
  value: z.string().optional().describe('Value for input/select actions'),
});

const GetStandardStepsSchema = z.object({
  category: z.string().optional().describe('Category of steps (UI, API, Database, etc.)'),
  language: z.enum(['ru', 'en']).optional().default('ru').describe('Language for step descriptions'),
});

const TakeScreenshotSchema = z.object({
  fileName: z.string().optional().describe('Name for the screenshot file'),
  fullPage: z.boolean().optional().default(false).describe('Capture full page or just visible area'),
  element: z.string().optional().describe('Specific element to capture'),
});

const WaitForSchema = z.object({
  condition: z.enum(['element', 'text', 'window', 'time']).describe('What to wait for'),
  target: z.string().optional().describe('Element/text/window to wait for'),
  timeout: z.number().optional().default(10).describe('Timeout in seconds'),
});

const GetTableDataSchema = z.object({
  tableName: z.string().describe('Name of the table to extract data from'),
  columns: z.array(z.string()).optional().describe('Specific columns to extract'),
  rowCount: z.number().optional().describe('Number of rows to extract'),
});

const StartRecordingSchema = z.object({
  name: z.string().describe('Name for the recording session'),
  outputPath: z.string().optional().describe('Path to save the recorded scenario'),
});

const AssertSchema = z.object({
  type: z.enum(['exists', 'value', 'enabled', 'visible', 'count']).describe('Type of assertion'),
  element: z.string().describe('Element to assert on'),
  expected: z.string().optional().describe('Expected value for value/count assertions'),
});

const NavigateSchema = z.object({
  target: z.enum(['back', 'forward', 'home', 'refresh']).describe('Navigation action'),
});

const GenerateTestDataSchema = z.object({
  dataType: z.enum(['inn', 'kpp', 'ogrn', 'snils', 'phone', 'email', 'date', 'string', 'number']).describe('Type of test data to generate'),
  count: z.number().optional().default(1).describe('Number of items to generate'),
  format: z.string().optional().describe('Specific format for the data'),
});

class VanessaAutomationServer {
  private server: Server;
  private vaPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'vanessa-automation-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.vaPath = process.env.VANESSA_AUTOMATION_PATH || '';
    
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_scenario',
          description: 'Run BDD scenarios using Vanessa Automation',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: {
                type: 'string',
                description: 'Path to the feature file with Gherkin scenarios',
              },
              configPath: {
                type: 'string',
                description: 'Path to VA configuration file',
              },
              additionalParams: {
                type: 'string',
                description: 'Additional command line parameters',
              },
            },
            required: ['featurePath'],
          },
        },
        {
          name: 'create_feature',
          description: 'Create a new feature file with Gherkin scenarios',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path where to save the feature file',
              },
              content: {
                type: 'string',
                description: 'Gherkin content of the feature file',
              },
            },
            required: ['filePath', 'content'],
          },
        },
        {
          name: 'parse_feature',
          description: 'Parse and validate a Gherkin feature file',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: {
                type: 'string',
                description: 'Path to the feature file to parse',
              },
            },
            required: ['featurePath'],
          },
        },
        {
          name: 'generate_steps',
          description: 'Generate step definitions for a feature file',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: {
                type: 'string',
                description: 'Path to the feature file',
              },
              outputPath: {
                type: 'string',
                description: 'Path for generated step definitions',
              },
            },
            required: ['featurePath'],
          },
        },
        {
          name: 'explore_form',
          description: 'Explore and analyze a 1C form structure and available elements',
          inputSchema: {
            type: 'object',
            properties: {
              formName: {
                type: 'string',
                description: 'Name or title of the 1C form to explore',
              },
              depth: {
                type: 'number',
                description: 'Depth of element exploration',
              },
            },
            required: ['formName'],
          },
        },
        {
          name: 'get_elements',
          description: 'Get UI elements from current 1C form',
          inputSchema: {
            type: 'object',
            properties: {
              elementType: {
                type: 'string',
                description: 'Type of elements to get (button, field, table, etc.)',
              },
              parentElement: {
                type: 'string',
                description: 'Parent element to search within',
              },
            },
          },
        },
        {
          name: 'perform_action',
          description: 'Perform UI action on 1C form element',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['click', 'input', 'select', 'check', 'doubleclick', 'rightclick'],
                description: 'Action to perform',
              },
              element: {
                type: 'string',
                description: 'Element identifier or path',
              },
              value: {
                type: 'string',
                description: 'Value for input/select actions',
              },
            },
            required: ['action', 'element'],
          },
        },
        {
          name: 'get_standard_steps',
          description: 'Get list of available standard VA steps for UI automation',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Category of steps (UI, API, Database, etc.)',
              },
              language: {
                type: 'string',
                enum: ['ru', 'en'],
                description: 'Language for step descriptions',
              },
            },
          },
        },
        {
          name: 'take_screenshot',
          description: 'Take screenshot of 1C application window or specific element',
          inputSchema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'Name for the screenshot file',
              },
              fullPage: {
                type: 'boolean',
                description: 'Capture full page or just visible area',
              },
              element: {
                type: 'string',
                description: 'Specific element to capture',
              },
            },
          },
        },
        {
          name: 'wait_for',
          description: 'Wait for specific condition in 1C interface',
          inputSchema: {
            type: 'object',
            properties: {
              condition: {
                type: 'string',
                enum: ['element', 'text', 'window', 'time'],
                description: 'What to wait for',
              },
              target: {
                type: 'string',
                description: 'Element/text/window to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in seconds',
              },
            },
            required: ['condition'],
          },
        },
        {
          name: 'get_table_data',
          description: 'Extract data from 1C table/list',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: 'Name of the table to extract data from',
              },
              columns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific columns to extract',
              },
              rowCount: {
                type: 'number',
                description: 'Number of rows to extract',
              },
            },
            required: ['tableName'],
          },
        },
        {
          name: 'start_recording',
          description: 'Start recording user actions to generate test scenario',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the recording session',
              },
              outputPath: {
                type: 'string',
                description: 'Path to save the recorded scenario',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'assert',
          description: 'Assert condition on 1C form element',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['exists', 'value', 'enabled', 'visible', 'count'],
                description: 'Type of assertion',
              },
              element: {
                type: 'string',
                description: 'Element to assert on',
              },
              expected: {
                type: 'string',
                description: 'Expected value for value/count assertions',
              },
            },
            required: ['type', 'element'],
          },
        },
        {
          name: 'navigate',
          description: 'Navigate in 1C application (back, forward, home, refresh)',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['back', 'forward', 'home', 'refresh'],
                description: 'Navigation action',
              },
            },
            required: ['target'],
          },
        },
        {
          name: 'generate_test_data',
          description: 'Generate test data for 1C (INN, KPP, OGRN, SNILS, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              dataType: {
                type: 'string',
                enum: ['inn', 'kpp', 'ogrn', 'snils', 'phone', 'email', 'date', 'string', 'number'],
                description: 'Type of test data to generate',
              },
              count: {
                type: 'number',
                description: 'Number of items to generate',
              },
              format: {
                type: 'string',
                description: 'Specific format for the data',
              },
            },
            required: ['dataType'],
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'run_scenario': {
          const { featurePath, configPath, additionalParams } = RunScenarioSchema.parse(args);
          return await this.runScenario(featurePath, configPath, additionalParams);
        }
        case 'create_feature': {
          const { filePath, content } = CreateFeatureSchema.parse(args);
          return await this.createFeature(filePath, content);
        }
        case 'parse_feature': {
          const { featurePath } = ParseFeatureSchema.parse(args);
          return await this.parseFeature(featurePath);
        }
        case 'generate_steps': {
          const { featurePath, outputPath } = GenerateStepsSchema.parse(args);
          return await this.generateSteps(featurePath, outputPath);
        }
        case 'explore_form': {
          const { formName, depth } = ExploreFormSchema.parse(args);
          return await this.exploreForm(formName, depth);
        }
        case 'get_elements': {
          const { elementType, parentElement } = GetElementsSchema.parse(args);
          return await this.getElements(elementType, parentElement);
        }
        case 'perform_action': {
          const { action, element, value } = PerformActionSchema.parse(args);
          return await this.performAction(action, element, value);
        }
        case 'get_standard_steps': {
          const { category, language } = GetStandardStepsSchema.parse(args);
          return await this.getStandardSteps(category, language);
        }
        case 'take_screenshot': {
          const { fileName, fullPage, element } = TakeScreenshotSchema.parse(args);
          return await this.takeScreenshot(fileName, fullPage, element);
        }
        case 'wait_for': {
          const { condition, target, timeout } = WaitForSchema.parse(args);
          return await this.waitFor(condition, target, timeout);
        }
        case 'get_table_data': {
          const { tableName, columns, rowCount } = GetTableDataSchema.parse(args);
          return await this.getTableData(tableName, columns, rowCount);
        }
        case 'start_recording': {
          const { name, outputPath } = StartRecordingSchema.parse(args);
          return await this.startRecording(name, outputPath);
        }
        case 'assert': {
          const { type, element, expected } = AssertSchema.parse(args);
          return await this.assert(type, element, expected);
        }
        case 'navigate': {
          const { target } = NavigateSchema.parse(args);
          return await this.navigate(target);
        }
        case 'generate_test_data': {
          const { dataType, count, format } = GenerateTestDataSchema.parse(args);
          return await this.generateTestData(dataType, count, format);
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async runScenario(
    featurePath: string,
    configPath?: string,
    additionalParams?: string
  ) {
    try {
      if (!this.vaPath) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: VANESSA_AUTOMATION_PATH environment variable is not set. Please set it to the path of your Vanessa Automation installation.',
            },
          ],
        };
      }

      const normalizedPath = path.normalize(featurePath);
      const fileExists = await fs.access(normalizedPath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Feature file not found at ${normalizedPath}`,
            },
          ],
        };
      }

      let command = `"${this.vaPath}" --run-scenarios "${normalizedPath}"`;
      
      if (configPath) {
        command += ` --settings "${configPath}"`;
      }
      
      if (additionalParams) {
        command += ` ${additionalParams}`;
      }

      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: `Scenario execution completed:\n\nOutput:\n${stdout}\n\nErrors (if any):\n${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running scenario: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async createFeature(filePath: string, content: string) {
    try {
      const normalizedPath = path.normalize(filePath);
      const dir = path.dirname(normalizedPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(normalizedPath, content, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Feature file created successfully at: ${normalizedPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating feature file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async parseFeature(featurePath: string) {
    try {
      const normalizedPath = path.normalize(featurePath);
      const content = await fs.readFile(normalizedPath, 'utf-8');
      
      const lines = content.split('\n');
      const features: any[] = [];
      let currentFeature: any = null;
      let currentScenario: any = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('Feature:') || trimmed.startsWith('Функционал:')) {
          currentFeature = {
            name: trimmed.replace(/^(Feature:|Функционал:)\s*/, ''),
            scenarios: [],
          };
          features.push(currentFeature);
        } else if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Сценарий:')) {
          currentScenario = {
            name: trimmed.replace(/^(Scenario:|Сценарий:)\s*/, ''),
            steps: [],
          };
          if (currentFeature) {
            currentFeature.scenarios.push(currentScenario);
          }
        } else if (
          (trimmed.startsWith('Given') || trimmed.startsWith('Дано')) ||
          (trimmed.startsWith('When') || trimmed.startsWith('Когда')) ||
          (trimmed.startsWith('Then') || trimmed.startsWith('Тогда')) ||
          (trimmed.startsWith('And') || trimmed.startsWith('И')) ||
          (trimmed.startsWith('But') || trimmed.startsWith('Но'))
        ) {
          if (currentScenario) {
            currentScenario.steps.push(trimmed);
          }
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Feature file parsed successfully:\n${JSON.stringify(features, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error parsing feature file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async generateSteps(featurePath: string, outputPath?: string) {
    try {
      const normalizedFeaturePath = path.normalize(featurePath);
      const content = await fs.readFile(normalizedFeaturePath, 'utf-8');
      
      const steps = new Set<string>();
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.match(/^(Given|When|Then|And|But|Дано|Когда|Тогда|И|Но)\s+/)
        ) {
          const stepText = trimmed.replace(/^(Given|When|Then|And|But|Дано|Когда|Тогда|И|Но)\s+/, '');
          steps.add(stepText);
        }
      }
      
      const stepDefinitions = Array.from(steps).map(step => {
        const methodName = step
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '_')
          .toLowerCase();
        
        return `// Step: ${step}\nПроцедура ${methodName}()\n    // TODO: Implement step\nКонецПроцедуры\n`;
      }).join('\n');
      
      if (outputPath) {
        const normalizedOutputPath = path.normalize(outputPath);
        await fs.writeFile(normalizedOutputPath, stepDefinitions, 'utf-8');
        
        return {
          content: [
            {
              type: 'text',
              text: `Step definitions generated and saved to: ${normalizedOutputPath}\n\nGenerated steps:\n${stepDefinitions}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Generated step definitions:\n\n${stepDefinitions}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating steps: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async exploreForm(formName: string, depth: number = 2) {
    try {
      const scenarioContent = `
# language: ru
Функционал: Исследование формы
Сценарий: Анализ формы "${formName}"
  Когда Я открываю форму "${formName}"
  И Я получаю список всех элементов формы с глубиной ${depth}
  И Я сохраняю структуру формы в лог
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `explore_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      
      await fs.unlink(tempFile).catch(() => {});
      
      return {
        content: [
          {
            type: 'text',
            text: `Form exploration initiated for: ${formName}\n${result.content[0]?.text || 'No result'}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error exploring form: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async getElements(elementType?: string, parentElement?: string) {
    try {
      let stepText = 'Я получаю список всех элементов текущей формы';
      
      if (elementType) {
        stepText = `Я получаю список элементов типа "${elementType}"`;
      }
      
      if (parentElement) {
        stepText += ` в контейнере "${parentElement}"`;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Получение элементов
Сценарий: Поиск элементов
  Когда ${stepText}
  И Я вывожу найденные элементы в лог
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `elements_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting elements: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async performAction(action: string, element: string, value?: string) {
    try {
      let stepText = '';
      
      switch (action) {
        case 'click':
          stepText = `Я нажимаю на элемент "${element}"`;
          break;
        case 'doubleclick':
          stepText = `Я делаю двойной клик на элемент "${element}"`;
          break;
        case 'rightclick':
          stepText = `Я делаю правый клик на элемент "${element}"`;
          break;
        case 'input':
          if (!value) {
            throw new Error('Value is required for input action');
          }
          stepText = `Я ввожу текст "${value}" в поле "${element}"`;
          break;
        case 'select':
          if (!value) {
            throw new Error('Value is required for select action');
          }
          stepText = `Я выбираю значение "${value}" в поле "${element}"`;
          break;
        case 'check':
          stepText = `Я устанавливаю флажок "${element}"`;
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      const scenarioContent = `
# language: ru
Функционал: Действие с элементом
Сценарий: Выполнение действия
  Когда ${stepText}
  И Пауза 1
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `action_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error performing action: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async getStandardSteps(category?: string, language: string = 'ru') {
    try {
      const standardSteps = {
        UI: {
          ru: [
            'Я нажимаю на кнопку "<имя>"',
            'Я нажимаю на кнопку командного интерфейса "<имя>"',
            'Я выбираю значение "<значение>" в поле "<имя>"',
            'Я ввожу текст "<текст>" в поле "<имя>"',
            'Я устанавливаю флажок "<имя>"',
            'Я снимаю флажок "<имя>"',
            'Я перехожу к закладке "<имя>"',
            'Я открываю выпадающий список "<имя>"',
            'Я нажимаю на гиперссылку "<имя>"',
            'Я активизирую поле "<имя>"',
            'Я выбираю из списка "<имя>" по "<значение>"',
            'В таблице "<имя>" я нажимаю на кнопку "<кнопка>"',
            'В таблице "<имя>" я выбираю текущую строку',
            'В таблице "<имя>" я активизирую поле "<поле>"',
            'Я закрываю текущее окно',
            'Я жду закрытия окна "<имя>" в течение <секунд> секунд',
          ],
          en: [
            'I click the button "<name>"',
            'I click command interface button "<name>"',
            'I select value "<value>" in field "<name>"',
            'I input text "<text>" in field "<name>"',
            'I set checkbox "<name>"',
            'I unset checkbox "<name>"',
            'I go to tab "<name>"',
            'I open dropdown list "<name>"',
            'I click hyperlink "<name>"',
            'I activate field "<name>"',
            'I select from list "<name>" by "<value>"',
            'In table "<name>" I click button "<button>"',
            'In table "<name>" I select current row',
            'In table "<name>" I activate field "<field>"',
            'I close current window',
            'I wait for window "<name>" to close for <seconds> seconds',
          ],
        },
        Navigation: {
          ru: [
            'Я открываю навигационную ссылку "<путь>"',
            'Я перехожу в раздел "<имя>"',
            'Я выбираю пункт меню "<имя>"',
            'Я открываю форму списка "<имя>"',
            'Я открываю форму элемента "<имя>"',
          ],
          en: [
            'I open navigation link "<path>"',
            'I go to section "<name>"',
            'I select menu item "<name>"',
            'I open list form "<name>"',
            'I open item form "<name>"',
          ],
        },
        Validation: {
          ru: [
            'Тогда открылось окно "<имя>"',
            'И поле "<имя>" имеет значение "<значение>"',
            'И таблица "<имя>" содержит строки:',
            'И элемент "<имя>" доступен',
            'И элемент "<имя>" не доступен',
            'И я проверяю наличие элемента "<имя>"',
            'И появилось предупреждение "<текст>"',
          ],
          en: [
            'Then window "<name>" opened',
            'And field "<name>" has value "<value>"',
            'And table "<name>" contains rows:',
            'And element "<name>" is available',
            'And element "<name>" is not available',
            'And I check element "<name>" exists',
            'And warning "<text>" appeared',
          ],
        },
        Data: {
          ru: [
            'Я создаю элемент справочника "<имя>"',
            'Я создаю документ "<имя>"',
            'Я провожу документ',
            'Я записываю элемент',
            'Я удаляю текущий элемент',
          ],
          en: [
            'I create catalog item "<name>"',
            'I create document "<name>"',
            'I post document',
            'I save item',
            'I delete current item',
          ],
        },
      };
      
      let steps: string[] = [];
      
      if (category) {
        const categorySteps = standardSteps[category as keyof typeof standardSteps];
        if (categorySteps) {
          steps = categorySteps[language as 'ru' | 'en'] || categorySteps.ru;
        }
      } else {
        for (const cat of Object.values(standardSteps)) {
          steps.push(...(cat[language as 'ru' | 'en'] || cat.ru));
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Standard VA steps${category ? ` for category "${category}"` : ''}:\n\n${steps.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting standard steps: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async takeScreenshot(fileName?: string, fullPage: boolean = false, element?: string) {
    try {
      const screenshotName = fileName || `screenshot_${Date.now()}.png`;
      const screenshotPath = path.join(process.env.TEMP || '/tmp', screenshotName);
      
      let stepText = `Я делаю снимок экрана "${screenshotPath}"`;
      if (element) {
        stepText = `Я делаю снимок элемента "${element}" и сохраняю в "${screenshotPath}"`;
      } else if (fullPage) {
        stepText = `Я делаю снимок всей страницы и сохраняю в "${screenshotPath}"`;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Снимок экрана
Сценарий: Создание снимка
  Когда ${stepText}
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `screenshot_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${screenshotPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error taking screenshot: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async waitFor(condition: string, target?: string, timeout: number = 10) {
    try {
      let stepText = '';
      
      switch (condition) {
        case 'element':
          if (!target) throw new Error('Target element is required');
          stepText = `Я жду появления элемента "${target}" в течение ${timeout} секунд`;
          break;
        case 'text':
          if (!target) throw new Error('Target text is required');
          stepText = `Я жду появления текста "${target}" в течение ${timeout} секунд`;
          break;
        case 'window':
          if (!target) throw new Error('Target window is required');
          stepText = `Я жду открытия окна "${target}" в течение ${timeout} секунд`;
          break;
        case 'time':
          stepText = `Пауза ${timeout}`;
          break;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Ожидание
Сценарий: Ожидание условия
  Когда ${stepText}
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `wait_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error waiting: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async getTableData(tableName: string, columns?: string[], rowCount?: number) {
    try {
      let stepText = `Я получаю данные из таблицы "${tableName}"`;
      
      if (columns && columns.length > 0) {
        stepText += ` для колонок "${columns.join('", "')}"`;
      }
      
      if (rowCount) {
        stepText += ` первые ${rowCount} строк`;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Извлечение данных
Сценарий: Получение данных таблицы
  Когда ${stepText}
  И Я сохраняю данные таблицы в переменную "tableData"
  И Я вывожу переменную "tableData" в лог
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `table_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting table data: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async startRecording(name: string, outputPath?: string) {
    try {
      const recordingPath = outputPath || path.join(process.cwd(), `recording_${name}.feature`);
      
      const scenarioContent = `
# language: ru
Функционал: Запись действий
Сценарий: Начало записи
  Когда Я начинаю запись действий пользователя с именем "${name}"
  И Я сохраняю запись в файл "${recordingPath}"
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `record_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return {
        content: [
          {
            type: 'text',
            text: `Recording started: ${name}\nOutput will be saved to: ${recordingPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error starting recording: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async assert(type: string, element: string, expected?: string) {
    try {
      let stepText = '';
      
      switch (type) {
        case 'exists':
          stepText = `Тогда элемент "${element}" существует`;
          break;
        case 'value':
          if (!expected) throw new Error('Expected value is required for value assertion');
          stepText = `Тогда поле "${element}" имеет значение "${expected}"`;
          break;
        case 'enabled':
          stepText = `Тогда элемент "${element}" доступен`;
          break;
        case 'visible':
          stepText = `Тогда элемент "${element}" видимый`;
          break;
        case 'count':
          if (!expected) throw new Error('Expected count is required for count assertion');
          stepText = `Тогда количество элементов "${element}" равно ${expected}`;
          break;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Проверка
Сценарий: Проверка условия
  ${stepText}
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `assert_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Assertion failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async navigate(target: string) {
    try {
      let stepText = '';
      
      switch (target) {
        case 'back':
          stepText = 'Я нажимаю кнопку "Назад" в браузере';
          break;
        case 'forward':
          stepText = 'Я нажимаю кнопку "Вперед" в браузере';
          break;
        case 'home':
          stepText = 'Я перехожу на главную страницу';
          break;
        case 'refresh':
          stepText = 'Я обновляю страницу';
          break;
      }
      
      const scenarioContent = `
# language: ru
Функционал: Навигация
Сценарий: Переход
  Когда ${stepText}
`;
      
      const tempFile = path.join(process.env.TEMP || '/tmp', `navigate_${Date.now()}.feature`);
      await fs.writeFile(tempFile, scenarioContent, 'utf-8');
      
      const result = await this.runScenario(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error navigating: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async generateTestData(dataType: string, count: number = 1, format?: string) {
    try {
      const data: string[] = [];
      
      for (let i = 0; i < count; i++) {
        switch (dataType) {
          case 'inn':
            data.push(this.generateINN());
            break;
          case 'kpp':
            data.push(this.generateKPP());
            break;
          case 'ogrn':
            data.push(this.generateOGRN());
            break;
          case 'snils':
            data.push(this.generateSNILS());
            break;
          case 'phone':
            data.push(this.generatePhone(format));
            break;
          case 'email':
            data.push(this.generateEmail());
            break;
          case 'date':
            data.push(this.generateDate(format));
            break;
          case 'string':
            data.push(this.generateString(format));
            break;
          case 'number':
            data.push(this.generateNumber(format));
            break;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Generated ${dataType} data:\n${data.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating test data: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private generateINN(): string {
    const region = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const inspection = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const number = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const base = region + inspection + number;
    
    const n10 = [2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, coef, i) => sum + coef * parseInt(base[i] || '0'), 0) % 11 % 10;
    const n11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, coef, i) => sum + coef * parseInt((base + n10)[i] || '0'), 0) % 11 % 10;
    const n12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, coef, i) => sum + coef * parseInt((base + n10 + n11)[i] || '0'), 0) % 11 % 10;
    
    return base + n10 + n11 + n12;
  }

  private generateKPP(): string {
    const region = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const inspection = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const reason = '01';
    const number = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return region + inspection + reason + number;
  }

  private generateOGRN(): string {
    const sign = '1';
    const year = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const region = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const number = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    const base = sign + year + region + number;
    const control = (BigInt(base) % 11n % 10n).toString();
    return base + control;
  }

  private generateSNILS(): string {
    const number = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(number[i] || '0') * (9 - i);
    }
    let control = sum % 101;
    if (control === 100) control = 0;
    return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6, 9)} ${control.toString().padStart(2, '0')}`;
  }

  private generatePhone(format?: string): string {
    const code = ['903', '905', '906', '909', '910', '915', '916', '917', '919', '925', '926', '929'][Math.floor(Math.random() * 12)];
    const number = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    
    if (format === 'international') {
      return `+7 (${code}) ${number.slice(0, 3)}-${number.slice(3, 5)}-${number.slice(5, 7)}`;
    }
    return `8${code}${number}`;
  }

  private generateEmail(): string {
    const names = ['ivan', 'petr', 'maria', 'anna', 'alex', 'olga', 'sergey', 'elena'];
    const domains = ['mail.ru', 'yandex.ru', 'gmail.com', 'company.ru'];
    const name = names[Math.floor(Math.random() * names.length)];
    const number = Math.floor(Math.random() * 999);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}${number}@${domain}`;
  }

  private generateDate(format?: string): string {
    const date = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
    
    if (format === 'iso') {
      return date.toISOString().split('T')[0] || '';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  }

  private generateString(format?: string): string {
    if (format === 'uuid') {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const words = ['Тест', 'Данные', 'Проверка', 'Образец', 'Пример'];
    return `${words[Math.floor(Math.random() * words.length)]}_${Math.floor(Math.random() * 9999)}`;
  }

  private generateNumber(format?: string): string {
    if (format === 'float') {
      return (Math.random() * 10000).toFixed(2);
    }
    return Math.floor(Math.random() * 999999).toString();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vanessa Automation MCP server running');
  }
}

const server = new VanessaAutomationServer();
server.run().catch(console.error);