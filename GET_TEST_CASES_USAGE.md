# get_test_cases Tool - Advanced Search Guide

## Overview
The `get_test_cases` tool provides comprehensive search and filtering capabilities for finding test cases in Zephyr. Unlike the basic `search_test_cases` tool, this offers granular control over filtering, sorting, and response formatting.

## Key Features

### 1. Title Search Options
- **Exact Match**: `title: "User Login Test"`
- **Contains**: `titleContains: "Login"` (case-insensitive by default)
- **Starts With**: `titleStartsWith: "User"`
- **Ends With**: `titleEndsWith: "Test"`

### 2. Content Search
- **In Objective/Description**: `objectiveContains: "authentication"`
- **In Preconditions**: `preconditionContains: "logged out"`

### 3. Metadata Filtering
- **Status**: Single or multiple - `status: "Draft"` or `status: ["Draft", "Approved"]`
- **Priority**: `priority: "High"` or `priority: ["High", "Medium"]`
- **Labels/Tags**: `labels: ["regression", "smoke"]`
- **Folder**: By ID or path - `folderId: "12345"` or `folderPath: "/Regression/API"`
- **Component**: `componentId: "comp-123"`

### 4. User-based Filtering
- **Owner**: `owner: "john.doe@company.com"`
- **Created By**: `createdBy: "jane.smith@company.com"`
- **Last Modified By**: `lastModifiedBy: "admin@company.com"`

### 5. Date Filtering
- **Created Date Range**: 
  - `createdAfter: "2024-01-01"`
  - `createdBefore: "2024-12-31"`
- **Modified Date Range**:
  - `modifiedAfter: "2024-06-01T10:00:00"`
  - `modifiedBefore: "2024-06-30T23:59:59"`

### 6. Test Execution Filters
- **Has Linked Issues**: `hasLinkedIssues: true`
- **Has Test Steps**: `hasTestSteps: true`
- **Estimated Time Range**:
  - `estimatedTimeMin: 5` (minutes)
  - `estimatedTimeMax: 30` (minutes)

### 7. Advanced Filters
- **Test Type**: `testType: "MANUAL"` or `"AUTOMATED"` or `"BOTH"`
- **Script Type**: `testScriptType: "STEP_BY_STEP"` or `"PLAIN_TEXT"` or `"NONE"`
- **Custom Fields**: `customFields: { "customField1": "value1" }`

## Search Options

### Combining Filters
- **AND Mode** (default): All filters must match
- **OR Mode**: Any filter can match
```json
{
  "searchMode": "AND"  // or "OR"
}
```

### Case Sensitivity
```json
{
  "caseSensitive": false  // default is false
}
```

### Include Archived
```json
{
  "includeArchived": false  // default is false
}
```

## Pagination & Sorting

### Pagination
```json
{
  "limit": 100,    // 1-500, default 100
  "offset": 0      // skip first N results
}
```

### Sorting
```json
{
  "sortBy": "name",  // Options: name, createdOn, lastModifiedOn, priority, status, estimatedTime, folder
  "sortOrder": "asc" // or "desc"
}
```

## Response Options

### Include Additional Data
```json
{
  "includeDetails": true,  // Full test case details
  "includeSteps": true,    // Test steps
  "includeLinks": true     // Linked JIRA issues
}
```

## Usage Examples

### Example 1: Find all login-related test cases
```json
{
  "projectKey": "CSRP",
  "filters": {
    "titleContains": "login"
  }
}
```

### Example 2: Find high-priority test cases created this month
```json
{
  "projectKey": "CSRP",
  "filters": {
    "priority": "High",
    "createdAfter": "2024-01-01"
  },
  "sortBy": "createdOn",
  "sortOrder": "desc"
}
```

### Example 3: Find test cases in specific folder with steps
```json
{
  "projectKey": "CSRP",
  "filters": {
    "folderPath": "/Regression/API",
    "hasTestSteps": true
  },
  "includeSteps": true
}
```

### Example 4: Complex multi-filter search
```json
{
  "projectKey": "CSRP",
  "filters": {
    "titleContains": "payment",
    "status": ["Draft", "In Review"],
    "priority": ["High", "Critical"],
    "labels": ["regression"],
    "createdAfter": "2024-01-01",
    "estimatedTimeMax": 30,
    "hasLinkedIssues": true
  },
  "searchMode": "AND",
  "sortBy": "priority",
  "sortOrder": "desc",
  "limit": 50,
  "includeDetails": true
}
```

### Example 5: Find automated tests needing review
```json
{
  "projectKey": "CSRP",
  "filters": {
    "testType": "AUTOMATED",
    "status": "Draft",
    "modifiedBefore": "2024-01-01"
  },
  "sortBy": "lastModifiedOn",
  "sortOrder": "asc"
}
```

### Example 6: Find test cases by multiple criteria with OR logic
```json
{
  "projectKey": "CSRP",
  "filters": {
    "titleContains": "checkout",
    "objectiveContains": "payment",
    "labels": ["critical", "payment"]
  },
  "searchMode": "OR",  // Match ANY of the filters
  "limit": 200
}
```

## Agent Usage Tips

When using with GitHub Copilot or other agents:

1. **For simple title search**:
   "Find all test cases with 'login' in the title"
   → Uses `titleContains: "login"`

2. **For status-based search**:
   "Show me all draft test cases"
   → Uses `status: "Draft"`

3. **For date-based search**:
   "Find test cases created this week"
   → Uses `createdAfter: "2024-01-15"` (adjusts date automatically)

4. **For priority filtering**:
   "List high and critical priority test cases"
   → Uses `priority: ["High", "Critical"]`

5. **For folder-based search**:
   "Get all test cases in the regression folder"
   → Uses `folderPath: "/Regression"`

## Performance Tips

1. **Use specific filters** to reduce result set size
2. **Limit fields returned** - only request `includeDetails` or `includeSteps` when needed
3. **Use pagination** for large result sets
4. **Sort on indexed fields** (name, createdOn, status) for better performance
5. **Combine filters efficiently** - use AND mode when possible to reduce processing

## Common Use Cases

### Quality Assurance
- Find test cases without steps: `hasTestSteps: false`
- Find outdated tests: `modifiedBefore: "2023-01-01"`
- Find tests missing estimates: `estimatedTimeMin: 0, estimatedTimeMax: 0`

### Test Planning
- Find tests for specific component: `componentId: "component-123"`
- Find tests by label/tag: `labels: ["smoke", "regression"]`
- Find tests in priority order: `sortBy: "priority", sortOrder: "desc"`

### Test Execution
- Find manual tests only: `testType: "MANUAL"`
- Find tests with linked issues: `hasLinkedIssues: true`
- Find quick tests: `estimatedTimeMax: 10`

### Reporting
- Get all approved tests: `status: "Approved"`
- Find tests by owner: `owner: "test.lead@company.com"`
- Get tests with full details: `includeDetails: true, includeSteps: true`

## Error Handling

The tool provides detailed error messages including:
- Invalid filter combinations
- Authentication issues
- Permission problems
- Project not found errors

## Comparison with Other Tools

| Feature | get_test_cases | search_test_cases | get_test_case |
|---------|---------------|-------------------|---------------|
| Multiple filters | ✅ Yes | ❌ No | ❌ No |
| Text search | ✅ Advanced | ✅ Basic | ❌ No |
| Sorting | ✅ Yes | ❌ No | ❌ No |
| Pagination | ✅ Yes | ✅ Limited | ❌ No |
| Include steps | ✅ Yes | ❌ No | ✅ Yes |
| Bulk operations | ✅ Yes | ✅ Yes | ❌ No |
| Requires exact ID | ❌ No | ❌ No | ✅ Yes |