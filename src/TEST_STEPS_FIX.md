# Test Case Steps Creation Fix

## Problem Description

The test case creation was successful, but the steps and expected results were not visible in the Zephyr UI. This was happening because:

1. The test case was being created successfully with the `testScript` data
2. However, the Zephyr API doesn't automatically create test steps from the `testScript.steps` array
3. Test steps need to be created separately using a different API endpoint

## Root Cause

The issue was in the `createTestCase` method in `clients/zephyr-client.ts`. The method was sending the `testScript` data to the test case creation endpoint, but the Zephyr API requires test steps to be created separately using the `/testcases/{testCaseKey}/teststeps` endpoint.

## Solution

### 1. Added `createTestCaseSteps` Method

Added a new method to the `ZephyrClient` class that creates test steps individually:

```typescript
async createTestCaseSteps(testCaseKey: string, steps: Array<{
  index: number;
  description: string;
  testData?: string;
  expectedResult: string;
}>): Promise<void>
```

### 2. Modified `createTestCase` Method

Updated the `createTestCase` method to automatically create test steps after creating the test case:

```typescript
// If test script has steps, create them separately
if (data.testScript?.type === 'STEP_BY_STEP' && data.testScript.steps && data.testScript.steps.length > 0) {
  try {
    await this.createTestCaseSteps(testCase.key, data.testScript.steps);
  } catch (error) {
    console.warn('Failed to create test steps:', error);
    // Don't fail the test case creation if steps fail
  }
}
```

### 3. Enhanced Response Data

Updated the response in `tools/test-cases.ts` to include the created steps in the response:

```typescript
// Get the created steps if they exist
let steps: any[] = [];
if (validatedInput.testScript?.type === 'STEP_BY_STEP' && validatedInput.testScript.steps) {
  try {
    steps = await getZephyrClient().getTestCaseSteps(testCase.key);
  } catch (error) {
    console.warn('Failed to retrieve test steps:', error);
  }
}
```

### 4. Added Debug Tool

Added a `debug_test_case_steps` tool to help troubleshoot step creation issues.

## API Structure

The test steps are created using the following API structure:

```json
{
  "index": 1,
  "inline": {
    "description": "Step description",
    "testData": "Optional test data",
    "expectedResult": "Expected result"
  }
}
```

## Testing

To test the fix:

1. Use the `create_test_case` tool with test script data including steps
2. Use the `get_test_case` tool to retrieve the created test case
3. Use the `debug_test_case_steps` tool to verify steps were created
4. Check the Zephyr UI to confirm steps are visible

## Files Modified

- `clients/zephyr-client.ts` - Added `createTestCaseSteps` method and updated `createTestCase`
- `tools/test-cases.ts` - Enhanced response to include steps data
- `index.ts` - Added debug tool for troubleshooting
- `test-steps-fix.js` - Test script for verification
- `TEST_STEPS_FIX.md` - This documentation

## Expected Behavior After Fix

- Test cases are created successfully
- Test steps are automatically created and visible in the UI
- Each step includes description and expected result
- The `get_test_case` response includes the steps array
- Steps are properly formatted in the Zephyr interface
