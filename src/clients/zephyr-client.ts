import axios, { AxiosInstance } from 'axios';
import { getZephyrHeaders } from '../utils/config.js';
import {
  ZephyrTestPlan,
  ZephyrTestCycle,
  ZephyrTestExecution,
  ZephyrTestCase,
  ZephyrTestReport,
  ZephyrExecutionSummary,
} from '../types/zephyr-types.js';

export class ZephyrClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.zephyrscale.smartbear.com/v2',
      headers: getZephyrHeaders(),
      timeout: 30000,
    });
  }

  async createTestPlan(data: {
    name: string;
    description?: string;
    projectKey: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ZephyrTestPlan> {
    const payload = {
      name: data.name,
      objective: data.description,
      projectKey: data.projectKey,
      plannedStartDate: data.startDate,
      plannedEndDate: data.endDate,
    };

    const response = await this.client.post('/testplans', payload);
    return response.data;
  }

  async getTestPlans(projectKey: string, limit = 50, offset = 0): Promise<{
    testPlans: ZephyrTestPlan[];
    total: number;
  }> {
    const params = {
      projectKey,
      maxResults: limit,
      startAt: offset,
    };

    const response = await this.client.get('/testplans', { params });
    return {
      testPlans: response.data.values || response.data,
      total: response.data.total || response.data.length,
    };
  }

  async createTestCycle(data: {
    name: string;
    description?: string;
    projectKey: string;
    versionId: string;
    environment?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ZephyrTestCycle> {
    const payload = {
      name: data.name,
      description: data.description,
      projectKey: data.projectKey,
      versionId: data.versionId,
      environment: data.environment,
      plannedStartDate: data.startDate,
      plannedEndDate: data.endDate,
    };

    const response = await this.client.post('/testcycles', payload);
    return response.data;
  }

  async getTestCycles(projectKey: string, versionId?: string, limit = 50): Promise<{
    testCycles: ZephyrTestCycle[];
    total: number;
  }> {
    const params = {
      projectKey,
      versionId,
      maxResults: limit,
    };

    const response = await this.client.get('/testcycles', { params });
    return {
      testCycles: response.data.values || response.data,
      total: response.data.total || response.data.length,
    };
  }

  async getTestExecution(executionId: string): Promise<ZephyrTestExecution> {
    const response = await this.client.get(`/testexecutions/${executionId}`);
    return response.data;
  }

  async updateTestExecution(data: {
    executionId: string;
    status: 'PASS' | 'FAIL' | 'WIP' | 'BLOCKED';
    comment?: string;
    defects?: string[];
  }): Promise<ZephyrTestExecution> {
    const payload = {
      status: data.status,
      comment: data.comment,
      issues: data.defects?.map(key => ({ key })),
    };

    const response = await this.client.put(`/testexecutions/${data.executionId}`, payload);
    return response.data;
  }

  async getTestExecutionSummary(cycleId: string): Promise<ZephyrExecutionSummary> {
    const response = await this.client.get(`/testcycles/${cycleId}/testexecutions`);
    const executions = response.data.values;

    const summary = executions.reduce(
      (acc: any, execution: any) => {
        acc.total++;
        switch (execution.status) {
          case 'PASS':
            acc.passed++;
            break;
          case 'FAIL':
            acc.failed++;
            break;
          case 'BLOCKED':
            acc.blocked++;
            break;
          case 'WIP':
            acc.inProgress++;
            break;
          default:
            acc.notExecuted++;
        }
        return acc;
      },
      { total: 0, passed: 0, failed: 0, blocked: 0, inProgress: 0, notExecuted: 0 }
    );

    summary.passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    return summary;
  }

  async linkTestCaseToIssue(testCaseId: string, issueKey: string): Promise<void> {
    const payload = {
      issueKeys: [issueKey],
    };

    await this.client.post(`/testcases/${testCaseId}/links`, payload);
  }

  async generateTestReport(cycleId: string): Promise<ZephyrTestReport> {
    const cycleResponse = await this.client.get(`/testcycles/${cycleId}`);
    const cycle = cycleResponse.data;

    const executionsResponse = await this.client.get(`/testcycles/${cycleId}/testexecutions`);
    const executions = executionsResponse.data.values || executionsResponse.data;

    const summary = await this.getTestExecutionSummary(cycleId);

    return {
      cycleId,
      cycleName: cycle.name,
      projectKey: cycle.projectKey,
      summary,
      executions,
      generatedOn: new Date().toISOString(),
    };
  }

  async getTestCase(testCaseId: string): Promise<ZephyrTestCase> {
    const response = await this.client.get(`/testcases/${testCaseId}`);
    return response.data;
  }

  async searchTestCases(projectKey: string, query?: string, limit = 50): Promise<{
    testCases: ZephyrTestCase[];
    total: number;
  }> {
    console.log('Searching test cases for project:', projectKey, 'with query:', query);
    
    // First, let's try just getting all test cases for the project without search
    // This will help us understand if the issue is with the search or the endpoint
    if (!query) {
      try {
        console.log('No query provided, fetching all test cases for project');
        const params = {
          projectKey,
          maxResults: limit,
        };
        
        const response = await this.client.get('/testcases', { params });
        console.log('Got test cases without search, status:', response.status);
        
        return {
          testCases: response.data.values || response.data || [],
          total: response.data.total || (response.data.values ? response.data.values.length : 0) || 0,
        };
      } catch (error: any) {
        console.error('Failed to get test cases without search:', error.response?.data);
      }
    }
    
    // If there's a query, we need to figure out the correct search format
    // Zephyr Scale API might use different query formats
    
    // Try Option 1: Using JQL-like query with the /testcases endpoint
    try {
      console.log('Trying Option 1: /testcases with JQL query');
      const params: any = {
        projectKey,
        maxResults: limit,
      };
      
      // Try different query parameter names that Zephyr might expect
      if (query) {
        // Convert JQL-like syntax to what Zephyr expects
        // "name ~ Login" might need to be just "Login" for text search
        if (query.includes('name ~')) {
          // Extract the search term from "name ~ Login"
          const searchTerm = query.replace(/name\s*~\s*"?([^"]*)"?/, '$1').trim();
          params.query = searchTerm;
          console.log('Extracted search term:', searchTerm);
        } else {
          params.query = query;
        }
      }
      
      const response = await this.client.get('/testcases', { params });
      console.log('Option 1 success, status:', response.status);
      
      return {
        testCases: response.data.values || response.data || [],
        total: response.data.total || (response.data.values ? response.data.values.length : 0) || 0,
      };
    } catch (error1: any) {
      console.error('Option 1 failed:', error1.response?.data);
      
      // Try Option 2: Using search endpoint if it exists
      try {
        console.log('Trying Option 2: /testcases/search endpoint');
        const params: any = {
          projectKey,
          maxResults: limit,
        };
        
        if (query) {
          params.q = query; // Some APIs use 'q' for query
        }
        
        const response = await this.client.get('/testcases/search', { params });
        console.log('Option 2 success, status:', response.status);
        
        return {
          testCases: response.data.values || response.data || [],
          total: response.data.total || (response.data.values ? response.data.values.length : 0) || 0,
        };
      } catch (error2: any) {
        console.error('Option 2 failed:', error2.response?.data);
        
        // Both options failed, throw the original error
        throw error1;
      }
    }
  }

  async createTestCase(data: {
    projectKey: string;
    name: string;
    objective?: string;
    precondition?: string;
    estimatedTime?: number;
    priority?: string;
    status?: string;
    folderId?: string;
    labels?: string[];
    componentId?: string;
    customFields?: Record<string, any>;
    testScript?: {
      type: 'STEP_BY_STEP' | 'PLAIN_TEXT';
      steps?: Array<{
        index: number;
        description: string;
        testData?: string;
        expectedResult: string;
      }>;
      text?: string;
    };
  }): Promise<ZephyrTestCase> {
    const payload: any = {
      projectKey: data.projectKey,
      name: data.name,
      objective: data.objective,
      precondition: data.precondition,
      estimatedTime: data.estimatedTime,
    };

    if (data.priority) {
      payload.priority = data.priority;
    }

    if (data.status) {
      payload.status = data.status;
    }

    if (data.folderId) {
      payload.folderId = data.folderId;
    }

    if (data.labels && data.labels.length > 0) {
      payload.labels = data.labels;
    }

    if (data.componentId) {
      payload.componentId = data.componentId;
    }

    if (data.customFields) {
      payload.customFields = data.customFields;
    }

    if (data.testScript) {
      payload.testScript = data.testScript;
    }

    const response = await this.client.post('/testcases', payload);
    const testCase = response.data;

    // If test script has steps, create them separately
    if (data.testScript?.type === 'STEP_BY_STEP' && data.testScript.steps && data.testScript.steps.length > 0) {
      console.log(`Test case ${testCase.key} created successfully. Now creating ${data.testScript.steps.length} test steps...`);
      try {
        await this.createTestCaseSteps(testCase.key, data.testScript.steps);
        console.log(`Successfully created all test steps for test case ${testCase.key}`);
      } catch (error: any) {
        console.error('Failed to create test steps for test case', testCase.key, ':', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        // Don't fail the test case creation if steps fail, but log the error clearly
        console.warn('Test case was created but steps failed. You may need to add steps manually in the UI.');
      }
    } else {
      console.log(`Test case ${testCase.key} created without steps (no STEP_BY_STEP script provided)`);
    }

    return testCase;
  }

  // Keep signature as-is; only the payload changes.
  async createTestCaseSteps(
    testCaseKey: string,
    steps: Array<{ index?: number; description: string; testData?: string; expectedResult?: string }>
  ): Promise<void> {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('No steps to post. Provide at least one step.');
    }
    if (steps.length > 100) {
      throw new Error(`Too many steps (${steps.length}). Zephyr Scale bulk limit is 100.`);
    }
  
    const payload = {
      mode: 'OVERWRITE', // or 'APPEND'
      items: steps
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map(s => ({
          inline: {
            description: s.description,
            testData: s.testData ?? '',
            expectedResult: s.expectedResult ?? ''
          }
        }))
    };
  
    const res = await this.client.post(
      `/testcases/${encodeURIComponent(testCaseKey)}/teststeps`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  
    if (res.status !== 201) {
      throw new Error(`Unexpected status ${res.status} while creating steps`);
    }
  }
  

  async debugTestCaseSteps(testCaseKey: string): Promise<any> {
    try {
      const response = await this.client.get(`/testcases/${testCaseKey}/teststeps`);
      console.log('Current test steps for test case:', testCaseKey, response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get test steps:', {
        testCaseKey,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  }

  async debugTestCaseInfo(testCaseKey: string): Promise<any> {
    try {
      console.log(`Debugging test case info for: ${testCaseKey}`);
      const testCaseResponse = await this.client.get(`/testcases/${testCaseKey}`);
      console.log('Test case details:', testCaseResponse.data);
      
      try {
        const stepsResponse = await this.client.get(`/testcases/${testCaseKey}/teststeps`);
        console.log('Test steps details:', stepsResponse.data);
        return {
          testCase: testCaseResponse.data,
          steps: stepsResponse.data,
        };
      } catch (stepsError: any) {
        console.log('Steps endpoint error:', stepsError.response?.data || stepsError.message);
        return {
          testCase: testCaseResponse.data,
          steps: null,
          stepsError: stepsError.response?.data || stepsError.message,
        };
      }
    } catch (error: any) {
      console.error('Failed to get test case info:', error.response?.data || error.message);
      throw error;
    }
  }

  async createMultipleTestCases(testCases: Array<{
    projectKey: string;
    name: string;
    objective?: string;
    precondition?: string;
    estimatedTime?: number;
    priority?: string;
    status?: string;
    folderId?: string;
    labels?: string[];
    componentId?: string;
    customFields?: Record<string, any>;
    testScript?: {
      type: 'STEP_BY_STEP' | 'PLAIN_TEXT';
      steps?: Array<{
        index: number;
        description: string;
        testData?: string;
        expectedResult: string;
      }>;
      text?: string;
    };
  }>, continueOnError = true): Promise<{
    results: Array<{
      index: number;
      success: boolean;
      data?: ZephyrTestCase;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: Array<{
      index: number;
      success: boolean;
      data?: ZephyrTestCase;
      error?: string;
    }> = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < testCases.length; i++) {
      try {
        const testCase = await this.createTestCase(testCases[i]);
        results.push({
          index: i,
          success: true,
          data: testCase,
        });
        successful++;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        results.push({
          index: i,
          success: false,
          error: errorMessage,
        });
        failed++;

        if (!continueOnError) {
          break;
        }
      }
    }

    return {
      results,
      summary: {
        total: testCases.length,
        successful,
        failed,
      },
    };
  }

  async getTestCaseSteps(testCaseId: string): Promise<any[]> {
    const response = await this.client.get(`/testcases/${testCaseId}/teststeps`);
    return response.data.values || response.data;
  }

  async updateTestCase(testCaseId: string, updates: any): Promise<ZephyrTestCase> {
    try {
      console.log(`Updating test case ${testCaseId} with:`, JSON.stringify(updates, null, 2));
      
      // Prepare the payload for Zephyr API
      const payload: any = {};
      
      // Map fields to Zephyr API format
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.objective !== undefined) payload.objective = updates.objective;
      if (updates.precondition !== undefined) payload.precondition = updates.precondition;
      if (updates.estimatedTime !== undefined) payload.estimatedTime = updates.estimatedTime;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.folderId !== undefined) payload.folderId = updates.folderId;
      if (updates.labels !== undefined) payload.labels = updates.labels;
      if (updates.componentId !== undefined) payload.componentId = updates.componentId;
      if (updates.customFields !== undefined) payload.customFields = updates.customFields;
      if (updates.testType !== undefined) payload.testType = updates.testType;
      
      // Update the test case basic fields
      const response = await this.client.put(`/testcases/${testCaseId}`, payload);
      console.log(`Test case ${testCaseId} basic fields updated successfully`);
      
      // Handle test script/steps updates separately
      if (updates.testScript || updates.stepOperations) {
        await this.updateTestCaseSteps(testCaseId, updates.testScript, updates.stepOperations);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to update test case:', {
        testCaseId,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
      throw error;
    }
  }

  async updateTestCaseSteps(
    testCaseId: string, 
    testScript?: any, 
    stepOperations?: any
  ): Promise<void> {
    try {
      // If testScript is provided, it's a complete replacement
      if (testScript && testScript.type === 'STEP_BY_STEP' && testScript.steps) {
        console.log(`Replacing all steps for test case ${testCaseId}`);
        await this.createTestCaseSteps(testCaseId, testScript.steps);
        return;
      }
      
      // Handle step operations (partial updates)
      if (stepOperations) {
        const { mode, steps, deleteIndexes } = stepOperations;
        
        switch (mode) {
          case 'REPLACE':
            // Replace all steps with new ones
            if (steps && steps.length > 0) {
              console.log(`Replacing all steps for test case ${testCaseId}`);
              await this.createTestCaseSteps(testCaseId, steps);
            }
            break;
            
          case 'APPEND':
            // Get existing steps and append new ones
            if (steps && steps.length > 0) {
              console.log(`Appending ${steps.length} steps to test case ${testCaseId}`);
              const existingSteps = await this.getTestCaseSteps(testCaseId);
              const maxIndex = existingSteps.length;
              const newSteps = steps.map((step: any, idx: number) => ({
                ...step,
                index: step.index || (maxIndex + idx + 1)
              }));
              
              // Combine existing and new steps
              const allSteps = [...existingSteps, ...newSteps];
              await this.createTestCaseSteps(testCaseId, allSteps);
            }
            break;
            
          case 'UPDATE':
            // Update specific steps by index
            if (steps && steps.length > 0) {
              console.log(`Updating ${steps.length} steps in test case ${testCaseId}`);
              const existingSteps = await this.getTestCaseSteps(testCaseId);
              
              // Create a map of updates by index
              const updateMap = new Map(steps.map((s: any) => [s.index, s]));
              
              // Apply updates to existing steps
              const updatedSteps = existingSteps.map((existing: any, idx: number) => {
                const stepIndex = idx + 1; // 1-based index
                const update = updateMap.get(stepIndex);
                
                if (update) {
                  return {
                    index: stepIndex,
                    description: update.description || existing.inline?.description || existing.description,
                    testData: update.testData !== undefined ? update.testData : (existing.inline?.testData || existing.testData || ''),
                    expectedResult: update.expectedResult || existing.inline?.expectedResult || existing.expectedResult,
                  };
                }
                
                return {
                  index: stepIndex,
                  description: existing.inline?.description || existing.description,
                  testData: existing.inline?.testData || existing.testData || '',
                  expectedResult: existing.inline?.expectedResult || existing.expectedResult,
                };
              });
              
              await this.createTestCaseSteps(testCaseId, updatedSteps);
            }
            break;
            
          case 'DELETE':
            // Delete specific steps by index
            if (deleteIndexes && deleteIndexes.length > 0) {
              console.log(`Deleting steps at indexes ${deleteIndexes} from test case ${testCaseId}`);
              const existingSteps = await this.getTestCaseSteps(testCaseId);
              
              // Filter out steps to delete (convert to 0-based for array)
              const remainingSteps = existingSteps
                .filter((_: any, idx: number) => !deleteIndexes.includes(idx + 1))
                .map((step: any, idx: number) => ({
                  index: idx + 1,
                  description: step.inline?.description || step.description,
                  testData: step.inline?.testData || step.testData || '',
                  expectedResult: step.inline?.expectedResult || step.expectedResult,
                }));
              
              if (remainingSteps.length > 0) {
                await this.createTestCaseSteps(testCaseId, remainingSteps);
              } else {
                // If no steps remain, send empty array to clear all steps
                await this.client.post(
                  `/testcases/${encodeURIComponent(testCaseId)}/teststeps`,
                  { mode: 'OVERWRITE', items: [] },
                  { headers: { 'Content-Type': 'application/json' } }
                );
              }
            }
            break;
        }
      }
    } catch (error: any) {
      console.error('Failed to update test case steps:', {
        testCaseId,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async getTestCasesAdvanced(projectKey: string, limit = 100, offset = 0): Promise<{
    testCases: ZephyrTestCase[];
    total: number;
  }> {
    try {
      console.log('Getting test cases with advanced options for project:', projectKey);
      const params = {
        projectKey,
        maxResults: limit,
        startAt: offset,
        // Request additional fields if supported
        expand: 'folder,labels,component,priority,status',
      };
      
      const response = await this.client.get('/testcases', { params });
      const testCases = response.data.values || response.data || [];
      
      console.log('Got test cases, count:', testCases.length);
      
      // Log first test case structure for debugging
      if (testCases.length > 0) {
        const sample = testCases[0];
        console.log('Sample test case data structure:', {
          key: sample.key,
          name: sample.name,
          hasFolder: !!sample.folder,
          folderStructure: sample.folder ? {
            type: typeof sample.folder,
            keys: typeof sample.folder === 'object' ? Object.keys(sample.folder) : 'not-object',
            id: sample.folder?.id,
            name: sample.folder?.name,
            path: sample.folder?.path
          } : null,
          hasLabels: !!sample.labels,
          labelsStructure: {
            type: Array.isArray(sample.labels) ? 'array' : typeof sample.labels,
            count: Array.isArray(sample.labels) ? sample.labels.length : 0,
            sample: sample.labels && sample.labels[0] ? 
              (typeof sample.labels[0] === 'object' ? 
                { type: 'object', keys: Object.keys(sample.labels[0]) } : 
                sample.labels[0]) : null
          }
        });
      }
      
      return {
        testCases: testCases,
        total: response.data.total || testCases.length,
      };
    } catch (error: any) {
      console.error('Failed to get test cases:', error.response?.data);
      throw error;
    }
  }
}