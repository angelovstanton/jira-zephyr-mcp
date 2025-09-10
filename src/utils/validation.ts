import { z } from 'zod';

export const createTestPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  projectKey: z.string().min(1, 'Project key is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createTestCycleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  projectKey: z.string().min(1, 'Project key is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  environment: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const readJiraIssueSchema = z.object({
  issueKey: z.string().min(1, 'Issue key is required'),
  fields: z.array(z.string()).optional(),
});

export const listTestPlansSchema = z.object({
  projectKey: z.string().min(1, 'Project key is required'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const listTestCyclesSchema = z.object({
  projectKey: z.string().min(1, 'Project key is required'),
  versionId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export const executeTestSchema = z.object({
  executionId: z.string().min(1, 'Execution ID is required'),
  status: z.enum(['PASS', 'FAIL', 'WIP', 'BLOCKED']),
  comment: z.string().optional(),
  defects: z.array(z.string()).optional(),
});

export const getTestExecutionStatusSchema = z.object({
  cycleId: z.string().min(1, 'Cycle ID is required'),
});

export const linkTestsToIssuesSchema = z.object({
  testCaseId: z.string().min(1, 'Test case ID is required'),
  issueKeys: z.array(z.string().min(1)).min(1, 'At least one issue key is required'),
});

export const generateTestReportSchema = z.object({
  cycleId: z.string().min(1, 'Cycle ID is required'),
  format: z.enum(['JSON', 'HTML']).default('JSON'),
});

export const createTestCaseSchema = z.object({
  projectKey: z.string().min(1, 'Project key is required'),
  name: z.string().min(1, 'Name is required'),
  objective: z.string().optional(),
  precondition: z.string().optional(),
  estimatedTime: z.number().min(0).optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  folderId: z.string().optional(),
  labels: z.array(z.string()).optional(),
  componentId: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  testScript: z.object({
    type: z.enum(['STEP_BY_STEP', 'PLAIN_TEXT']),
    steps: z.array(z.object({
      index: z.number().min(1),
      description: z.string().min(1),
      testData: z.string().optional(),
      expectedResult: z.string().min(1),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
});

export const getTestCaseSchema = z.object({
  testCaseId: z.string()
    .min(1, 'Test case ID is required')
    .regex(/^[A-Z]+-T\d+$/, 'Test case ID must be in format PROJECT-T123 (e.g., CSRP-T123). For searching test cases, use get_test_cases instead.'),
});

export const createMultipleTestCasesSchema = z.object({
  testCases: z.array(createTestCaseSchema).min(1, 'At least one test case is required'),
  continueOnError: z.boolean().default(true),
});

export const updateTestCaseSchema = z.object({
  testCaseId: z.string()
    .min(1, 'Test case ID is required')
    .regex(/^[A-Z]+-T\d+$/, 'Test case ID must be in format PROJECT-T123 (e.g., CSRP-T123)'),
  
  updates: z.object({
    // Basic fields
    name: z.string().min(1).optional().describe('Test case title/name'),
    objective: z.string().optional().describe('Test case objective/description'),
    precondition: z.string().optional().describe('Test preconditions'),
    estimatedTime: z.number().min(0).optional().describe('Estimated execution time in minutes'),
    
    // Status and priority
    priority: z.string().optional().describe('Priority (e.g., High, Medium, Low)'),
    status: z.string().optional().describe('Status (e.g., Draft, Approved, Deprecated)'),
    
    // Organization
    folderId: z.string().optional().describe('Folder ID to move test case'),
    labels: z.array(z.string()).optional().describe('Labels/tags for the test case'),
    componentId: z.string().optional().describe('Component ID'),
    
    // Test script - complete replacement
    testScript: z.object({
      type: z.enum(['STEP_BY_STEP', 'PLAIN_TEXT']),
      steps: z.array(z.object({
        index: z.number().min(1).describe('Step number (1-based)'),
        description: z.string().min(1).describe('Step description'),
        testData: z.string().optional().describe('Test data for this step'),
        expectedResult: z.string().min(1).describe('Expected result'),
      })).optional().describe('Test steps for STEP_BY_STEP type'),
      text: z.string().optional().describe('Plain text script for PLAIN_TEXT type'),
    }).optional().describe('Test script with steps or plain text'),
    
    // Step operations - for partial updates
    stepOperations: z.object({
      mode: z.enum(['REPLACE', 'APPEND', 'UPDATE', 'DELETE']).describe('How to modify steps'),
      steps: z.array(z.object({
        index: z.number().min(1).describe('Step number to update/delete (1-based)'),
        description: z.string().optional().describe('New step description'),
        testData: z.string().optional().describe('New test data'),
        expectedResult: z.string().optional().describe('New expected result'),
      })).optional().describe('Steps to add/update/delete'),
      deleteIndexes: z.array(z.number()).optional().describe('Step indexes to delete (for DELETE mode)'),
    }).optional().describe('Operations for modifying individual steps'),
    
    // Custom fields
    customFields: z.record(z.any()).optional().describe('Custom field values'),
    
    // Additional metadata
    testType: z.enum(['MANUAL', 'AUTOMATED', 'BOTH']).optional().describe('Test type'),
    owner: z.string().optional().describe('Owner email or account ID'),
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),
  
  // Update options
  options: z.object({
    preserveUnsetFields: z.boolean().default(true).describe('Keep fields not specified in update'),
    validateSteps: z.boolean().default(true).describe('Validate step consistency'),
    createBackup: z.boolean().default(false).describe('Create backup before update'),
    returnUpdated: z.boolean().default(true).describe('Return updated test case in response'),
  }).optional(),
});

export const getTestCasesSchema = z.object({
  projectKey: z.string().min(1, 'Project key is required'),
  filters: z.object({
    // Title filters
    title: z.string().optional().describe('Exact title match'),
    titleContains: z.string().optional().describe('Title contains text (case-insensitive)'),
    titleStartsWith: z.string().optional().describe('Title starts with text'),
    titleEndsWith: z.string().optional().describe('Title ends with text'),
    
    // Content filters
    objectiveContains: z.string().optional().describe('Search in test objective/description'),
    preconditionContains: z.string().optional().describe('Search in preconditions'),
    
    // Metadata filters
    status: z.union([
      z.string(),
      z.array(z.string())
    ]).optional().describe('Filter by status (single or multiple)'),
    priority: z.union([
      z.string(),
      z.array(z.string())
    ]).optional().describe('Filter by priority (e.g., High, Medium, Low)'),
    
    // Organization filters
    folderId: z.string().optional().describe('Filter by folder ID'),
    folderPath: z.string().optional().describe('Filter by folder path (e.g., /Regression/API)'),
    labels: z.array(z.string()).optional().describe('Filter by labels/tags'),
    componentId: z.string().optional().describe('Filter by component'),
    
    // User filters
    owner: z.string().optional().describe('Filter by owner email or ID'),
    createdBy: z.string().optional().describe('Filter by creator'),
    lastModifiedBy: z.string().optional().describe('Filter by last modifier'),
    
    // Date filters
    createdAfter: z.string().optional().describe('Created after date (ISO format)'),
    createdBefore: z.string().optional().describe('Created before date (ISO format)'),
    modifiedAfter: z.string().optional().describe('Modified after date (ISO format)'),
    modifiedBefore: z.string().optional().describe('Modified before date (ISO format)'),
    
    // Test execution filters
    hasLinkedIssues: z.boolean().optional().describe('Has linked JIRA issues'),
    hasTestSteps: z.boolean().optional().describe('Has test steps defined'),
    estimatedTimeMin: z.number().optional().describe('Minimum estimated time in minutes'),
    estimatedTimeMax: z.number().optional().describe('Maximum estimated time in minutes'),
    
    // Advanced filters
    customFields: z.record(z.any()).optional().describe('Filter by custom field values'),
    testType: z.enum(['MANUAL', 'AUTOMATED', 'BOTH']).optional().describe('Filter by test type'),
    testScriptType: z.enum(['STEP_BY_STEP', 'PLAIN_TEXT', 'NONE']).optional().describe('Filter by script type'),
  }).optional(),
  
  // Search options
  searchMode: z.enum(['AND', 'OR']).default('AND').describe('How to combine filters'),
  caseSensitive: z.boolean().default(false).describe('Case-sensitive text matching'),
  includeArchived: z.boolean().default(false).describe('Include archived test cases'),
  
  // Pagination and sorting
  limit: z.number().min(1).max(500).default(100).describe('Maximum results to return'),
  offset: z.number().min(0).default(0).describe('Number of results to skip'),
  sortBy: z.enum([
    'name', 'createdOn', 'lastModifiedOn', 'priority', 
    'status', 'estimatedTime', 'folder'
  ]).default('name').describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').describe('Sort order'),
  
  // Response options
  includeDetails: z.boolean().default(false).describe('Include full test case details'),
  includeSteps: z.boolean().default(false).describe('Include test steps in response'),
  includeLinks: z.boolean().default(false).describe('Include linked issues in response'),
});

export type CreateTestPlanInput = z.infer<typeof createTestPlanSchema>;
export type CreateTestCycleInput = z.infer<typeof createTestCycleSchema>;
export type ReadJiraIssueInput = z.infer<typeof readJiraIssueSchema>;
export type ListTestPlansInput = z.infer<typeof listTestPlansSchema>;
export type ListTestCyclesInput = z.infer<typeof listTestCyclesSchema>;
export type ExecuteTestInput = z.infer<typeof executeTestSchema>;
export type GetTestExecutionStatusInput = z.infer<typeof getTestExecutionStatusSchema>;
export type LinkTestsToIssuesInput = z.infer<typeof linkTestsToIssuesSchema>;
export type GenerateTestReportInput = z.infer<typeof generateTestReportSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type GetTestCaseInput = z.infer<typeof getTestCaseSchema>;
export type CreateMultipleTestCasesInput = z.infer<typeof createMultipleTestCasesSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type GetTestCasesInput = z.infer<typeof getTestCasesSchema>;