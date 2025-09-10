import { ZephyrClient } from '../clients/zephyr-client.js';
import {
  createTestCaseSchema,
  createMultipleTestCasesSchema,
  getTestCasesSchema,
  CreateTestCaseInput,
  CreateMultipleTestCasesInput,
  GetTestCasesInput,
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

export const getTestCases = async (input: GetTestCasesInput) => {
  const validatedInput = getTestCasesSchema.parse(input);
  
  try {
    const zephyr = getZephyrClient();
    
    // First, get all test cases for the project (with pagination)
    const allTestCases = await zephyr.getTestCasesAdvanced(
      validatedInput.projectKey,
      validatedInput.limit || 100,
      validatedInput.offset || 0
    );
    
    let filteredTestCases = allTestCases.testCases;
    
    // Apply filters if provided
    if (validatedInput.filters) {
      const filters = validatedInput.filters;
      const searchMode = validatedInput.searchMode || 'AND';
      const caseSensitive = validatedInput.caseSensitive || false;
      
      filteredTestCases = filteredTestCases.filter(testCase => {
        const matches: boolean[] = [];
        
        // Title filters
        if (filters.title !== undefined) {
          const titleMatch = caseSensitive 
            ? testCase.name === filters.title
            : testCase.name?.toLowerCase() === filters.title.toLowerCase();
          matches.push(titleMatch);
        }
        
        if (filters.titleContains !== undefined) {
          const contains = caseSensitive
            ? testCase.name?.includes(filters.titleContains)
            : testCase.name?.toLowerCase().includes(filters.titleContains.toLowerCase());
          matches.push(contains || false);
        }
        
        if (filters.titleStartsWith !== undefined) {
          const startsWith = caseSensitive
            ? testCase.name?.startsWith(filters.titleStartsWith)
            : testCase.name?.toLowerCase().startsWith(filters.titleStartsWith.toLowerCase());
          matches.push(startsWith || false);
        }
        
        if (filters.titleEndsWith !== undefined) {
          const endsWith = caseSensitive
            ? testCase.name?.endsWith(filters.titleEndsWith)
            : testCase.name?.toLowerCase().endsWith(filters.titleEndsWith.toLowerCase());
          matches.push(endsWith || false);
        }
        
        // Content filters
        if (filters.objectiveContains !== undefined) {
          const contains = caseSensitive
            ? testCase.objective?.includes(filters.objectiveContains)
            : testCase.objective?.toLowerCase().includes(filters.objectiveContains.toLowerCase());
          matches.push(contains || false);
        }
        
        if (filters.preconditionContains !== undefined) {
          const contains = caseSensitive
            ? testCase.precondition?.includes(filters.preconditionContains)
            : testCase.precondition?.toLowerCase().includes(filters.preconditionContains.toLowerCase());
          matches.push(contains || false);
        }
        
        // Status filter
        if (filters.status !== undefined) {
          const statusList = Array.isArray(filters.status) ? filters.status : [filters.status];
          const statusMatch = statusList.some(s => {
            const statusName = typeof testCase.status === 'object' ? testCase.status?.name : testCase.status;
            return caseSensitive
              ? statusName === s
              : statusName?.toLowerCase() === s.toLowerCase();
          });
          matches.push(statusMatch);
        }
        
        // Priority filter
        if (filters.priority !== undefined) {
          const priorityList = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
          const priorityMatch = priorityList.some(p => {
            const priorityName = typeof testCase.priority === 'object' ? testCase.priority?.name : testCase.priority;
            return caseSensitive
              ? priorityName === p
              : priorityName?.toLowerCase() === p.toLowerCase();
          });
          matches.push(priorityMatch);
        }
        
        // Folder filter
        if (filters.folderId !== undefined) {
          const folderMatch = testCase.folder?.id === filters.folderId;
          matches.push(folderMatch);
        }
        
        if (filters.folderPath !== undefined) {
          const folderPath = testCase.folder?.name || testCase.folder?.path;
          const pathMatch = caseSensitive
            ? folderPath === filters.folderPath
            : folderPath?.toLowerCase() === filters.folderPath.toLowerCase();
          matches.push(pathMatch || false);
        }
        
        // Labels filter
        if (filters.labels !== undefined && filters.labels.length > 0) {
          const labelMatch = filters.labels.some(label => 
            testCase.labels?.some(tcLabel => 
              caseSensitive 
                ? tcLabel === label
                : tcLabel.toLowerCase() === label.toLowerCase()
            )
          );
          matches.push(labelMatch);
        }
        
        // Component filter
        if (filters.componentId !== undefined) {
          const componentMatch = testCase.component?.id === filters.componentId;
          matches.push(componentMatch);
        }
        
        // Owner filter
        if (filters.owner !== undefined) {
          const ownerMatch = testCase.owner?.accountId === filters.owner || 
                           testCase.owner?.emailAddress === filters.owner;
          matches.push(ownerMatch);
        }
        
        // Date filters
        if (filters.createdAfter !== undefined) {
          const createdDate = new Date(testCase.createdOn);
          const filterDate = new Date(filters.createdAfter);
          matches.push(createdDate >= filterDate);
        }
        
        if (filters.createdBefore !== undefined) {
          const createdDate = new Date(testCase.createdOn);
          const filterDate = new Date(filters.createdBefore);
          matches.push(createdDate <= filterDate);
        }
        
        if (filters.modifiedAfter !== undefined && testCase.lastModifiedOn) {
          const modifiedDate = new Date(testCase.lastModifiedOn);
          const filterDate = new Date(filters.modifiedAfter);
          matches.push(modifiedDate >= filterDate);
        }
        
        if (filters.modifiedBefore !== undefined && testCase.lastModifiedOn) {
          const modifiedDate = new Date(testCase.lastModifiedOn);
          const filterDate = new Date(filters.modifiedBefore);
          matches.push(modifiedDate <= filterDate);
        }
        
        // Test execution filters
        if (filters.hasLinkedIssues !== undefined) {
          const hasLinks = (testCase.links?.issues?.length || 0) > 0;
          matches.push(hasLinks === filters.hasLinkedIssues);
        }
        
        if (filters.hasTestSteps !== undefined) {
          const hasSteps = testCase.testScript?.type === 'STEP_BY_STEP' && 
                         (testCase.testScript?.steps?.length || 0) > 0;
          matches.push(hasSteps === filters.hasTestSteps);
        }
        
        if (filters.estimatedTimeMin !== undefined) {
          matches.push((testCase.estimatedTime || 0) >= filters.estimatedTimeMin);
        }
        
        if (filters.estimatedTimeMax !== undefined) {
          matches.push((testCase.estimatedTime || 0) <= filters.estimatedTimeMax);
        }
        
        // Test type filter
        if (filters.testType !== undefined) {
          const testTypeMatch = testCase.testType === filters.testType;
          matches.push(testTypeMatch);
        }
        
        // Test script type filter
        if (filters.testScriptType !== undefined) {
          const scriptTypeMatch = filters.testScriptType === 'NONE' 
            ? !testCase.testScript || !testCase.testScript.type
            : testCase.testScript?.type === filters.testScriptType;
          matches.push(scriptTypeMatch);
        }
        
        // Custom fields filter
        if (filters.customFields !== undefined) {
          const customFieldMatches = Object.entries(filters.customFields).every(([key, value]) => {
            return testCase.customFields?.[key] === value;
          });
          matches.push(customFieldMatches);
        }
        
        // Apply search mode (AND/OR)
        if (matches.length === 0) return true; // No filters applied
        return searchMode === 'AND' 
          ? matches.every(m => m)
          : matches.some(m => m);
      });
    }
    
    // Sort results
    if (validatedInput.sortBy) {
      filteredTestCases.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (validatedInput.sortBy) {
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'createdOn':
            aVal = new Date(a.createdOn).getTime();
            bVal = new Date(b.createdOn).getTime();
            break;
          case 'lastModifiedOn':
            aVal = a.lastModifiedOn ? new Date(a.lastModifiedOn).getTime() : 0;
            bVal = b.lastModifiedOn ? new Date(b.lastModifiedOn).getTime() : 0;
            break;
          case 'priority':
            aVal = typeof a.priority === 'object' ? a.priority?.name : a.priority || '';
            bVal = typeof b.priority === 'object' ? b.priority?.name : b.priority || '';
            break;
          case 'status':
            aVal = typeof a.status === 'object' ? a.status?.name : a.status || '';
            bVal = typeof b.status === 'object' ? b.status?.name : b.status || '';
            break;
          case 'estimatedTime':
            aVal = a.estimatedTime || 0;
            bVal = b.estimatedTime || 0;
            break;
          case 'folder':
            aVal = a.folder?.name || '';
            bVal = b.folder?.name || '';
            break;
          default:
            aVal = a.name || '';
            bVal = b.name || '';
        }
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return validatedInput.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    // Include additional details if requested
    let enrichedTestCases = filteredTestCases;
    if (validatedInput.includeSteps || validatedInput.includeDetails) {
      enrichedTestCases = await Promise.all(
        filteredTestCases.map(async (testCase) => {
          const enriched = { ...testCase };
          
          if (validatedInput.includeSteps) {
            try {
              enriched.steps = await zephyr.getTestCaseSteps(testCase.key);
            } catch (error) {
              console.warn(`Failed to get steps for ${testCase.key}:`, error);
              enriched.steps = [];
            }
          }
          
          if (validatedInput.includeDetails) {
            try {
              const detailed = await zephyr.getTestCase(testCase.key);
              Object.assign(enriched, detailed);
            } catch (error) {
              console.warn(`Failed to get details for ${testCase.key}:`, error);
            }
          }
          
          return enriched;
        })
      );
    }
    
    return {
      success: true,
      data: {
        testCases: enrichedTestCases,
        total: enrichedTestCases.length,
        totalAvailable: allTestCases.total,
        filters: validatedInput.filters,
        searchMode: validatedInput.searchMode,
        sortBy: validatedInput.sortBy,
        sortOrder: validatedInput.sortOrder,
      },
      message: `Found ${enrichedTestCases.length} test cases matching your criteria`,
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: {
        originalError: error.response?.data || error.message,
        status: error.response?.status,
      },
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