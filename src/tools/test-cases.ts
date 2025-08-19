import { ZephyrClient } from '../clients/zephyr-client.js';
import {
  createTestCaseSchema,
  searchTestCasesSchema,
  createMultipleTestCasesSchema,
  CreateTestCaseInput,
  SearchTestCasesInput,
  CreateMultipleTestCasesInput,
} from '../utils/validation.js';

let zephyrClient: ZephyrClient | null = null;

const getZephyrClient = (): ZephyrClient => {
  if (!zephyrClient) {
    zephyrClient = new ZephyrClient();
  }
  return zephyrClient;
};

export const createTestCase = async (input: CreateTestCaseInput) => {
  const validatedInput = createTestCaseSchema.parse(input);
  
  try {
    const testCase = await getZephyrClient().createTestCase({
      projectKey: validatedInput.projectKey,
      name: validatedInput.name,
      objective: validatedInput.objective,
      precondition: validatedInput.precondition,
      estimatedTime: validatedInput.estimatedTime,
      priority: validatedInput.priority,
      status: validatedInput.status,
      folderId: validatedInput.folderId,
      labels: validatedInput.labels,
      componentId: validatedInput.componentId,
      customFields: validatedInput.customFields,
      testScript: validatedInput.testScript,
    });
    
    // Get the created steps if they exist
    let steps: any[] = [];
    if (validatedInput.testScript?.type === 'STEP_BY_STEP' && validatedInput.testScript.steps) {
      try {
        steps = await getZephyrClient().getTestCaseSteps(testCase.key);
      } catch (error) {
        console.warn('Failed to retrieve test steps:', error);
      }
    }
    
    return {
      success: true,
      data: {
        id: testCase.id,
        key: testCase.key,
        name: testCase.name,
        projectKey: testCase.project?.id,
        objective: testCase.objective,
        precondition: testCase.precondition,
        estimatedTime: testCase.estimatedTime,
        priority: testCase.priority?.id,
        status: testCase.status?.id,
        folder: testCase.folder?.id,
        labels: testCase.labels || [],
        component: testCase.component?.id,
        owner: testCase.owner?.accountId,
        createdOn: testCase.createdOn,
        links: {
          self: `https://api.zephyrscale.smartbear.com/v2/testcases/${testCase.key}`,
          issues: testCase.links?.issues?.length || 0,
        },
        testScript: validatedInput.testScript,
        steps: steps.map((step: any) => ({
          index: step.index,
          description: step.inline?.description || step.description,
          testData: step.inline?.testData || step.testData,
          expectedResult: step.inline?.expectedResult || step.expectedResult,
        })),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const searchTestCases = async (input: SearchTestCasesInput) => {
  const validatedInput = searchTestCasesSchema.parse(input);
  
  try {
    const result = await getZephyrClient().searchTestCases(
      validatedInput.projectKey,
      validatedInput.query,
      validatedInput.limit
    );
    
    return {
      success: true,
      data: {
        testCases: result.testCases.map(testCase => ({
          id: testCase.id,
          key: testCase.key,
          name: testCase.name,
          objective: testCase.objective,
          precondition: testCase.precondition,
          estimatedTime: testCase.estimatedTime,
          priority: testCase.priority?.id,
          status: testCase.status?.id,
          folder: testCase.folder?.id,
          labels: testCase.labels || [],
          component: testCase.component?.id,
          owner: testCase.owner?.accountId,
          createdOn: testCase.createdOn,
          linkedIssues: testCase.links?.issues?.length || 0,
        })),
        total: result.total,
        projectKey: validatedInput.projectKey,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const getTestCase = async (input: { testCaseId: string }) => {
  try {
    const zephyr = getZephyrClient();
    const testCase = await zephyr.getTestCase(input.testCaseId);
    const steps = await zephyr.getTestCaseSteps(input.testCaseId);

    return {
      success: true,
      data: {
        id: testCase.id,
        key: testCase.key,
        name: testCase.name,
        projectKey: testCase.project?.id,
        objective: testCase.objective,
        precondition: testCase.precondition,
        estimatedTime: testCase.estimatedTime,
        priority: testCase.priority,
        status: testCase.status,
        folder: testCase.folder,
        labels: testCase.labels || [],
        component: testCase.component,
        owner: testCase.owner,
        createdOn: testCase.createdOn,
        customFields: testCase.customFields,
        links: testCase.links,
        testScript: testCase.testScript,
        steps: steps.map((step: any) => ({
          description: step.inline?.description || step.description,
          testData: step.inline?.testData || step.testData,
          expectedResult: step.inline?.expectedResult || step.expectedResult,
        })),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const createMultipleTestCases = async (input: CreateMultipleTestCasesInput) => {
  const validatedInput = createMultipleTestCasesSchema.parse(input);
  
  try {
    const result = await getZephyrClient().createMultipleTestCases(
      validatedInput.testCases,
      validatedInput.continueOnError
    );
    
    // For each successful test case, get the steps if they were created
    const resultsWithSteps = await Promise.all(
      result.results.map(async (r) => {
        if (r.success && r.data) {
          const testCaseInput = validatedInput.testCases[r.index];
          let steps: any[] = [];
          
          if (testCaseInput.testScript?.type === 'STEP_BY_STEP' && testCaseInput.testScript.steps) {
            try {
              steps = await getZephyrClient().getTestCaseSteps(r.data.key);
            } catch (error) {
              console.warn(`Failed to retrieve test steps for ${r.data.key}:`, error);
            }
          }
          
          return {
            index: r.index,
            success: r.success,
            testCase: {
              id: r.data?.id,
              key: r.data?.key,
              name: r.data?.name,
              projectKey: r.data?.project?.id,
              objective: r.data?.objective,
              precondition: r.data?.precondition,
              estimatedTime: r.data?.estimatedTime,
              priority: r.data?.priority?.id,
              status: r.data?.status?.id,
              folder: r.data?.folder?.id,
              labels: r.data?.labels || [],
              component: r.data?.component?.id,
              owner: r.data?.owner?.accountId,
              createdOn: r.data?.createdOn,
              links: {
                self: r.data ? `https://api.zephyrscale.smartbear.com/v2/testcases/${r.data.key}` : undefined,
              },
              testScript: testCaseInput.testScript,
              steps: steps.map((step: any) => ({
                index: step.index,
                description: step.inline?.description || step.description,
                testData: step.inline?.testData || step.testData,
                expectedResult: step.inline?.expectedResult || step.expectedResult,
              })),
            },
            error: r.error,
          };
        } else {
          return {
            index: r.index,
            success: r.success,
            testCase: undefined,
            error: r.error,
          };
        }
      })
    );
    
    return {
      success: true,
      data: {
        results: resultsWithSteps,
        summary: result.summary,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};