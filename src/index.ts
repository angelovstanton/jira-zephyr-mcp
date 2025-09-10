import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { readJiraIssue } from './tools/jira-issues.js';
import { createTestPlan, listTestPlans } from './tools/test-plans.js';
import { createTestCycle, listTestCycles } from './tools/test-cycles.js';
import {
  executeTest,
  getTestExecutionStatus,
  linkTestsToIssues,
  generateTestReport,
} from './tools/test-execution.js';
import { createTestCase, getTestCase, createMultipleTestCases, getTestCases, updateTestCase } from './tools/test-cases.js';
import {
  readJiraIssueSchema,
  createTestPlanSchema,
  listTestPlansSchema,
  createTestCycleSchema,
  listTestCyclesSchema,
  executeTestSchema,
  getTestExecutionStatusSchema,
  linkTestsToIssuesSchema,
  generateTestReportSchema,
  createTestCaseSchema,
  getTestCaseSchema,
  createMultipleTestCasesSchema,
  updateTestCaseSchema,
  getTestCasesSchema,
  ReadJiraIssueInput,
  CreateTestPlanInput,
  ListTestPlansInput,
  CreateTestCycleInput,
  ListTestCyclesInput,
  ExecuteTestInput,
  GetTestExecutionStatusInput,
  LinkTestsToIssuesInput,
  GenerateTestReportInput,
  CreateTestCaseInput,
  GetTestCaseInput,
  CreateMultipleTestCasesInput,
  UpdateTestCaseInput,
  GetTestCasesInput,
} from './utils/validation.js';

const server = new Server(
  {
    name: 'jira-zephyr-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
  }
);

const TOOLS = [
  {
    name: 'read_jira_issue',
    description: 'Read JIRA issue details and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'JIRA issue key (e.g., ABC-123)' },
        fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to retrieve (optional)' },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'create_test_plan',
    description: 'Create a new test plan in Zephyr',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Test plan name' },
        description: { type: 'string', description: 'Test plan description (optional)' },
        projectKey: { type: 'string', description: 'JIRA project key' },
        startDate: { type: 'string', description: 'Planned start date (ISO format, optional)' },
        endDate: { type: 'string', description: 'Planned end date (ISO format, optional)' },
      },
      required: ['name', 'projectKey'],
    },
  },
  {
    name: 'list_test_plans',
    description: 'List existing test plans',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'JIRA project key' },
        limit: { type: 'number', description: 'Maximum number of results (default: 50)' },
        offset: { type: 'number', description: 'Number of results to skip (default: 0)' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'create_test_cycle',
    description: 'Create a new test execution cycle',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Test cycle name' },
        description: { type: 'string', description: 'Test cycle description (optional)' },
        projectKey: { type: 'string', description: 'JIRA project key' },
        versionId: { type: 'string', description: 'JIRA version ID' },
        environment: { type: 'string', description: 'Test environment (optional)' },
        startDate: { type: 'string', description: 'Planned start date (ISO format, optional)' },
        endDate: { type: 'string', description: 'Planned end date (ISO format, optional)' },
      },
      required: ['name', 'projectKey', 'versionId'],
    },
  },
  {
    name: 'list_test_cycles',
    description: 'List existing test cycles with execution status',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'JIRA project key' },
        versionId: { type: 'string', description: 'JIRA version ID (optional)' },
        limit: { type: 'number', description: 'Maximum number of results (default: 50)' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'execute_test',
    description: 'Update test execution results',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Test execution ID' },
        status: { type: 'string', enum: ['PASS', 'FAIL', 'WIP', 'BLOCKED'], description: 'Execution status' },
        comment: { type: 'string', description: 'Execution comment (optional)' },
        defects: { type: 'array', items: { type: 'string' }, description: 'Linked defect keys (optional)' },
      },
      required: ['executionId', 'status'],
    },
  },
  {
    name: 'get_test_execution_status',
    description: 'Get test execution progress and statistics',
    inputSchema: {
      type: 'object',
      properties: {
        cycleId: { type: 'string', description: 'Test cycle ID' },
      },
      required: ['cycleId'],
    },
  },
  {
    name: 'link_tests_to_issues',
    description: 'Associate test cases with JIRA issues',
    inputSchema: {
      type: 'object',
      properties: {
        testCaseId: { type: 'string', description: 'Test case ID' },
        issueKeys: { type: 'array', items: { type: 'string' }, description: 'JIRA issue keys to link' },
      },
      required: ['testCaseId', 'issueKeys'],
    },
  },
  {
    name: 'generate_test_report',
    description: 'Generate test execution report',
    inputSchema: {
      type: 'object',
      properties: {
        cycleId: { type: 'string', description: 'Test cycle ID' },
        format: { type: 'string', enum: ['JSON', 'HTML'], description: 'Report format (default: JSON)' },
      },
      required: ['cycleId'],
    },
  },
  {
    name: 'create_test_case',
    description: 'Create a new test case in Zephyr',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'JIRA project key' },
        name: { type: 'string', description: 'Test case name' },
        objective: { type: 'string', description: 'Test case objective/description (optional)' },
        precondition: { type: 'string', description: 'Test preconditions (optional)' },
        estimatedTime: { type: 'number', description: 'Estimated execution time in minutes (optional)' },
        priority: { type: 'string', description: 'Test case priority (optional)' },
        status: { type: 'string', description: 'Test case status (optional)' },
        folderId: { type: 'string', description: 'Folder ID to organize test case (optional)' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Test case labels (optional)' },
        componentId: { type: 'string', description: 'Component ID (optional)' },
        customFields: { type: 'object', description: 'Custom fields as key-value pairs (optional)' },
        testScript: {
          type: 'object',
          description: 'Test script with steps (optional)',
          properties: {
            type: { type: 'string', enum: ['STEP_BY_STEP', 'PLAIN_TEXT'], description: 'Script type' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number', description: 'Step number' },
                  description: { type: 'string', description: 'Step description' },
                  testData: { type: 'string', description: 'Test data (optional)' },
                  expectedResult: { type: 'string', description: 'Expected result' },
                },
                required: ['index', 'description', 'expectedResult'],
              },
              description: 'Test steps (for STEP_BY_STEP type)',
            },
            text: { type: 'string', description: 'Plain text script (for PLAIN_TEXT type)' },
          },
          required: ['type'],
        },
      },
      required: ['projectKey', 'name'],
    },
  },
  {
    name: 'get_test_case',
    description: 'Get detailed information about a specific test case when you already know its exact ID (e.g., "CSRP-T123"). Do NOT use this for searching or listing test cases.',
    inputSchema: {
      type: 'object',
      properties: {
        testCaseId: { type: 'string', description: 'Exact test case ID in format PROJECT-T123 (e.g., "CSRP-T123")' },
      },
      required: ['testCaseId'],
    },
  },
  {
    name: 'debug_test_case_steps',
    description: 'Debug: Get test steps for a specific test case',
    inputSchema: {
      type: 'object',
      properties: {
        testCaseId: { type: 'string', description: 'Test case ID or key' },
      },
      required: ['testCaseId'],
    },
  },
  {
    name: 'debug_test_case_info',
    description: 'Debug: Get complete test case information including steps details',
    inputSchema: {
      type: 'object',
      properties: {
        testCaseId: { type: 'string', description: 'Test case ID or key' },
      },
      required: ['testCaseId'],
    },
  },
  {
    name: 'create_multiple_test_cases',
    description: 'Create multiple test cases in Zephyr at once',
    inputSchema: {
      type: 'object',
      properties: {
        testCases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'JIRA project key' },
              name: { type: 'string', description: 'Test case name' },
              objective: { type: 'string', description: 'Test case objective/description (optional)' },
              precondition: { type: 'string', description: 'Test preconditions (optional)' },
              estimatedTime: { type: 'number', description: 'Estimated execution time in minutes (optional)' },
              priority: { type: 'string', description: 'Test case priority (optional)' },
              status: { type: 'string', description: 'Test case status (optional)' },
              folderId: { type: 'string', description: 'Folder ID to organize test case (optional)' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Test case labels (optional)' },
              componentId: { type: 'string', description: 'Component ID (optional)' },
              customFields: { type: 'object', description: 'Custom fields as key-value pairs (optional)' },
              testScript: {
                type: 'object',
                description: 'Test script with steps (optional)',
                properties: {
                  type: { type: 'string', enum: ['STEP_BY_STEP', 'PLAIN_TEXT'], description: 'Script type' },
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        index: { type: 'number', description: 'Step number' },
                        description: { type: 'string', description: 'Step description' },
                        testData: { type: 'string', description: 'Test data (optional)' },
                        expectedResult: { type: 'string', description: 'Expected result' },
                      },
                      required: ['index', 'description', 'expectedResult'],
                    },
                    description: 'Test steps (for STEP_BY_STEP type)',
                  },
                  text: { type: 'string', description: 'Plain text script (for PLAIN_TEXT type)' },
                },
                required: ['type'],
              },
            },
            required: ['projectKey', 'name'],
          },
          description: 'Array of test cases to create',
        },
        continueOnError: { type: 'boolean', description: 'Continue creating remaining test cases if one fails (default: true)', default: true },
      },
      required: ['testCases'],
    },
  },
  {
    name: 'update_test_case',
    description: 'Update an existing test case including title, fields, steps, and expected results. Supports complete replacement or partial updates.',
    inputSchema: {
      type: 'object',
      properties: {
        testCaseId: { 
          type: 'string', 
          description: 'Test case ID in format PROJECT-T123 (e.g., "CSRP-T123")' 
        },
        updates: {
          type: 'object',
          description: 'Fields to update (all optional)',
          properties: {
            // Basic fields
            name: { type: 'string', description: 'Test case title/name' },
            objective: { type: 'string', description: 'Test case objective/description' },
            precondition: { type: 'string', description: 'Test preconditions' },
            estimatedTime: { type: 'number', minimum: 0, description: 'Estimated execution time in minutes' },
            
            // Status and priority
            priority: { type: 'string', description: 'Priority (e.g., High, Medium, Low)' },
            status: { type: 'string', description: 'Status (e.g., Draft, Approved, Deprecated)' },
            
            // Organization
            folderId: { type: 'string', description: 'Folder ID to move test case' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Labels/tags for the test case' },
            componentId: { type: 'string', description: 'Component ID' },
            
            // Complete test script replacement
            testScript: {
              type: 'object',
              description: 'Replace entire test script',
              properties: {
                type: { type: 'string', enum: ['STEP_BY_STEP', 'PLAIN_TEXT'], description: 'Script type' },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number', minimum: 1, description: 'Step number (1-based)' },
                      description: { type: 'string', description: 'Step description' },
                      testData: { type: 'string', description: 'Test data for this step' },
                      expectedResult: { type: 'string', description: 'Expected result' },
                    },
                    required: ['index', 'description', 'expectedResult'],
                  },
                  description: 'Test steps for STEP_BY_STEP type',
                },
                text: { type: 'string', description: 'Plain text script for PLAIN_TEXT type' },
              },
              required: ['type'],
            },
            
            // Partial step updates
            stepOperations: {
              type: 'object',
              description: 'Operations for modifying individual steps',
              properties: {
                mode: { 
                  type: 'string', 
                  enum: ['REPLACE', 'APPEND', 'UPDATE', 'DELETE'], 
                  description: 'How to modify steps: REPLACE (all), APPEND (add), UPDATE (modify specific), DELETE (remove specific)' 
                },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number', minimum: 1, description: 'Step number (1-based)' },
                      description: { type: 'string', description: 'New step description' },
                      testData: { type: 'string', description: 'New test data' },
                      expectedResult: { type: 'string', description: 'New expected result' },
                    },
                    required: ['index'],
                  },
                  description: 'Steps to add/update',
                },
                deleteIndexes: { 
                  type: 'array', 
                  items: { type: 'number', minimum: 1 }, 
                  description: 'Step indexes to delete (for DELETE mode)' 
                },
              },
              required: ['mode'],
            },
            
            // Additional fields
            customFields: { type: 'object', description: 'Custom field values' },
            testType: { type: 'string', enum: ['MANUAL', 'AUTOMATED', 'BOTH'], description: 'Test type' },
          },
        },
        options: {
          type: 'object',
          description: 'Update options',
          properties: {
            preserveUnsetFields: { type: 'boolean', default: true, description: 'Keep fields not specified in update' },
            validateSteps: { type: 'boolean', default: true, description: 'Validate step consistency' },
            createBackup: { type: 'boolean', default: false, description: 'Include original test case in response' },
            returnUpdated: { type: 'boolean', default: true, description: 'Return updated test case in response' },
          },
        },
      },
      required: ['testCaseId', 'updates'],
    },
  },
  {
    name: 'get_test_cases',
    description: 'Advanced search for test cases with multiple filter options. Use this for finding test cases by title, content, status, priority, folder, dates, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'JIRA project key (required)' },
        filters: {
          type: 'object',
          description: 'Filter criteria (all optional)',
          properties: {
            // Title filters
            title: { type: 'string', description: 'Exact title match' },
            titleContains: { type: 'string', description: 'Title contains text (case-insensitive by default)' },
            titleStartsWith: { type: 'string', description: 'Title starts with text' },
            titleEndsWith: { type: 'string', description: 'Title ends with text' },
            
            // Content filters
            objectiveContains: { type: 'string', description: 'Search in test objective/description' },
            preconditionContains: { type: 'string', description: 'Search in preconditions' },
            
            // Metadata filters
            status: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Filter by status (e.g., "Draft", "Approved", or ["Draft", "Approved"])' 
            },
            priority: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Filter by priority (e.g., "High", "Medium", "Low")' 
            },
            
            // Organization filters
            folderId: { type: 'string', description: 'Filter by folder ID' },
            folderPath: { type: 'string', description: 'Filter by folder path (e.g., "/Regression/API")' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Filter by labels/tags' },
            componentId: { type: 'string', description: 'Filter by component ID' },
            
            // User filters
            owner: { type: 'string', description: 'Filter by owner email or ID' },
            createdBy: { type: 'string', description: 'Filter by creator' },
            lastModifiedBy: { type: 'string', description: 'Filter by last modifier' },
            
            // Date filters (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
            createdAfter: { type: 'string', description: 'Created after date' },
            createdBefore: { type: 'string', description: 'Created before date' },
            modifiedAfter: { type: 'string', description: 'Modified after date' },
            modifiedBefore: { type: 'string', description: 'Modified before date' },
            
            // Test execution filters
            hasLinkedIssues: { type: 'boolean', description: 'Has linked JIRA issues' },
            hasTestSteps: { type: 'boolean', description: 'Has test steps defined' },
            estimatedTimeMin: { type: 'number', description: 'Minimum estimated time in minutes' },
            estimatedTimeMax: { type: 'number', description: 'Maximum estimated time in minutes' },
            
            // Advanced filters
            testType: { type: 'string', enum: ['MANUAL', 'AUTOMATED', 'BOTH'], description: 'Filter by test type' },
            testScriptType: { type: 'string', enum: ['STEP_BY_STEP', 'PLAIN_TEXT', 'NONE'], description: 'Filter by script type' },
          },
        },
        
        // Search options
        searchMode: { type: 'string', enum: ['AND', 'OR'], default: 'AND', description: 'How to combine filters' },
        caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive text matching' },
        includeArchived: { type: 'boolean', default: false, description: 'Include archived test cases' },
        
        // Pagination and sorting
        limit: { type: 'number', default: 100, minimum: 1, maximum: 500, description: 'Maximum results to return' },
        offset: { type: 'number', default: 0, minimum: 0, description: 'Number of results to skip' },
        sortBy: { 
          type: 'string', 
          enum: ['name', 'createdOn', 'lastModifiedOn', 'priority', 'status', 'estimatedTime', 'folder'],
          default: 'name',
          description: 'Field to sort by' 
        },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc', description: 'Sort order' },
        
        // Response options
        includeDetails: { type: 'boolean', default: false, description: 'Include full test case details' },
        includeSteps: { type: 'boolean', default: false, description: 'Include test steps in response' },
        includeLinks: { type: 'boolean', default: false, description: 'Include linked issues in response' },
      },
      required: ['projectKey'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

const validateInput = <T>(schema: any, input: unknown, toolName: string): T => {
  console.log(`Validating input for ${toolName}:`, JSON.stringify(input, null, 2));
  const result = schema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
    console.error(`Validation failed for ${toolName}:`, errors);
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid parameters for ${toolName}:\n${errors.join('\n')}`
    );
  }
  console.log(`Validation successful for ${toolName}:`, JSON.stringify(result.data, null, 2));
  return result.data as T;
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'read_jira_issue': {
        const validatedArgs = validateInput<ReadJiraIssueInput>(readJiraIssueSchema, args, 'read_jira_issue');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await readJiraIssue(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'create_test_plan': {
        const validatedArgs = validateInput<CreateTestPlanInput>(createTestPlanSchema, args, 'create_test_plan');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createTestPlan(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'list_test_plans': {
        const validatedArgs = validateInput<ListTestPlansInput>(listTestPlansSchema, args, 'list_test_plans');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listTestPlans(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'create_test_cycle': {
        const validatedArgs = validateInput<CreateTestCycleInput>(createTestCycleSchema, args, 'create_test_cycle');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createTestCycle(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'list_test_cycles': {
        const validatedArgs = validateInput<ListTestCyclesInput>(listTestCyclesSchema, args, 'list_test_cycles');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listTestCycles(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'execute_test': {
        const validatedArgs = validateInput<ExecuteTestInput>(executeTestSchema, args, 'execute_test');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await executeTest(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'get_test_execution_status': {
        const validatedArgs = validateInput<GetTestExecutionStatusInput>(getTestExecutionStatusSchema, args, 'get_test_execution_status');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getTestExecutionStatus(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'link_tests_to_issues': {
        const validatedArgs = validateInput<LinkTestsToIssuesInput>(linkTestsToIssuesSchema, args, 'link_tests_to_issues');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await linkTestsToIssues(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'generate_test_report': {
        const validatedArgs = validateInput<GenerateTestReportInput>(generateTestReportSchema, args, 'generate_test_report');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await generateTestReport(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'create_test_case': {
        const validatedArgs = validateInput<CreateTestCaseInput>(createTestCaseSchema, args, 'create_test_case');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createTestCase(validatedArgs), null, 2),
            },
          ],
        };
      }


      case 'get_test_case': {
        console.log('get_test_case called with args:', JSON.stringify(args, null, 2));
        console.log('WARNING: get_test_case requires an exact test case ID like "CSRP-T123"');
        console.log('If you want to search or list test cases, use get_test_cases instead');
        
        try {
          const validatedArgs = validateInput<GetTestCaseInput>(getTestCaseSchema, args, 'get_test_case');
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await getTestCase(validatedArgs), null, 2),
              },
            ],
          };
        } catch (error: any) {
          if (error.message && error.message.includes('format PROJECT-T123')) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'get_test_case requires an exact test case ID (e.g., "CSRP-T123"). To search or list test cases, please use the get_test_cases tool instead.'
            );
          }
          throw error;
        }
      }

      case 'debug_test_case_steps': {
        const validatedArgs = validateInput<GetTestCaseInput>(getTestCaseSchema, args, 'debug_test_case_steps');
        const zephyr = new (await import('./clients/zephyr-client.js')).ZephyrClient();
        const steps = await zephyr.debugTestCaseSteps(validatedArgs.testCaseId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data: steps }, null, 2),
            },
          ],
        };
      }

      case 'debug_test_case_info': {
        const validatedArgs = validateInput<GetTestCaseInput>(getTestCaseSchema, args, 'debug_test_case_info');
        const zephyr = new (await import('./clients/zephyr-client.js')).ZephyrClient();
        const info = await zephyr.debugTestCaseInfo(validatedArgs.testCaseId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data: info }, null, 2),
            },
          ],
        };
      }

      case 'create_multiple_test_cases': {
        const validatedArgs = validateInput<CreateMultipleTestCasesInput>(createMultipleTestCasesSchema, args, 'create_multiple_test_cases');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createMultipleTestCases(validatedArgs), null, 2),
            },
          ],
        };
      }

      case 'update_test_case': {
        console.log('update_test_case called with args:', JSON.stringify(args, null, 2));
        const validatedArgs = validateInput<UpdateTestCaseInput>(updateTestCaseSchema, args, 'update_test_case');
        const result = await updateTestCase(validatedArgs);
        console.log('update_test_case result:', result.success ? 'Success' : 'Failed');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_cases': {
        console.log('get_test_cases called with args:', JSON.stringify(args, null, 2));
        const validatedArgs = validateInput<GetTestCasesInput>(getTestCasesSchema, args, 'get_test_cases');
        console.log('Validated args for get_test_cases:', JSON.stringify(validatedArgs, null, 2));
        const result = await getTestCases(validatedArgs);
        console.log('get_test_cases result summary:', {
          success: result.success,
          testCasesFound: result.data?.testCases?.length || 0,
          total: result.data?.total || 0
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Error executing tool '${name}': ${errorMessage}`);
  }
});

async function main() {
  try {
    console.error('Starting Jira Zephyr MCP server...');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Jira Zephyr MCP server running...');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

    // Keep the process alive
    await new Promise(() => {});
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start MCP server:', errorMessage);
    if (errorMessage.includes('Configuration validation failed')) {
      console.error('Please check your environment variables and try again.');
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error during server startup:', err);
  process.exit(1);
});