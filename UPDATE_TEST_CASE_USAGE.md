# update_test_case Tool - Usage Guide

## Overview
The `update_test_case` tool provides comprehensive capabilities for updating existing test cases in Zephyr, including all fields, test steps, and expected results.

## Key Features

### 1. Basic Field Updates
Update fundamental test case properties:
- **Title/Name**: `name: "New Test Case Title"`
- **Objective**: `objective: "Updated description"`
- **Preconditions**: `precondition: "New preconditions"`
- **Estimated Time**: `estimatedTime: 15` (minutes)

### 2. Status and Priority
- **Status**: `status: "Approved"` (Draft, Approved, Deprecated)
- **Priority**: `priority: "High"` (High, Medium, Low)

### 3. Organization
- **Folder**: `folderId: "folder-123"`
- **Labels**: `labels: ["regression", "critical"]`
- **Component**: `componentId: "comp-456"`

### 4. Test Steps Management

#### Complete Replacement
Replace all steps with new ones:
```json
{
  "testScript": {
    "type": "STEP_BY_STEP",
    "steps": [
      {
        "index": 1,
        "description": "Open application",
        "testData": "URL: https://app.com",
        "expectedResult": "Application loads"
      },
      {
        "index": 2,
        "description": "Click login",
        "testData": "Credentials",
        "expectedResult": "Login page appears"
      }
    ]
  }
}
```

#### Step Operations
Modify steps without replacing everything:

**Modes:**
- `REPLACE`: Replace all steps
- `APPEND`: Add new steps to the end
- `UPDATE`: Modify specific steps by index
- `DELETE`: Remove specific steps

### 5. Update Options
- `preserveUnsetFields`: Keep fields not in update (default: true)
- `validateSteps`: Validate step consistency (default: true)
- `createBackup`: Include original in response (default: false)
- `returnUpdated`: Return updated test case (default: true)

## Usage Examples

### Example 1: Update Title and Priority
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "name": "Updated Login Test",
    "priority": "High"
  }
}
```

### Example 2: Replace All Test Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "testScript": {
      "type": "STEP_BY_STEP",
      "steps": [
        {
          "index": 1,
          "description": "Navigate to login page",
          "testData": "https://app.com/login",
          "expectedResult": "Login page displays"
        },
        {
          "index": 2,
          "description": "Enter valid credentials",
          "testData": "user@example.com / password123",
          "expectedResult": "Credentials accepted"
        },
        {
          "index": 3,
          "description": "Click submit",
          "testData": "",
          "expectedResult": "User logged in successfully"
        }
      ]
    }
  }
}
```

### Example 3: Append New Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "APPEND",
      "steps": [
        {
          "index": 4,
          "description": "Verify dashboard",
          "expectedResult": "Dashboard displays user info"
        },
        {
          "index": 5,
          "description": "Logout",
          "expectedResult": "User logged out"
        }
      ]
    }
  }
}
```

### Example 4: Update Specific Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "UPDATE",
      "steps": [
        {
          "index": 2,
          "description": "Enter UPDATED credentials",
          "testData": "newuser@example.com",
          "expectedResult": "Credentials validated"
        }
      ]
    }
  }
}
```

### Example 5: Delete Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "DELETE",
      "deleteIndexes": [3, 5]
    }
  }
}
```

### Example 6: Comprehensive Update with Backup
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "name": "Complete Payment Flow Test",
    "objective": "Verify end-to-end payment processing",
    "precondition": "User must be logged in with valid payment method",
    "priority": "Critical",
    "status": "Approved",
    "estimatedTime": 30,
    "labels": ["payment", "critical", "regression"],
    "testScript": {
      "type": "STEP_BY_STEP",
      "steps": [
        {
          "index": 1,
          "description": "Add items to cart",
          "testData": "Product IDs: 101, 102, 103",
          "expectedResult": "Items added to cart"
        },
        {
          "index": 2,
          "description": "Proceed to checkout",
          "expectedResult": "Checkout page displays"
        },
        {
          "index": 3,
          "description": "Enter payment details",
          "testData": "Test credit card: 4111-1111-1111-1111",
          "expectedResult": "Payment details accepted"
        },
        {
          "index": 4,
          "description": "Confirm order",
          "expectedResult": "Order confirmation displayed"
        }
      ]
    }
  },
  "options": {
    "createBackup": true,
    "returnUpdated": true
  }
}
```

### Example 7: Update Only Expected Results
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "UPDATE",
      "steps": [
        {
          "index": 1,
          "expectedResult": "Page loads within 3 seconds"
        },
        {
          "index": 2,
          "expectedResult": "Form validation passes"
        }
      ]
    }
  }
}
```

## Step Operation Modes Explained

### REPLACE Mode
- Removes all existing steps
- Adds the provided steps as the complete new set
- Use when you want to completely redefine test steps

### APPEND Mode
- Keeps all existing steps
- Adds new steps to the end
- Automatically assigns correct indexes
- Use when adding additional test scenarios

### UPDATE Mode
- Modifies specific steps by index
- Only changes fields you provide
- Preserves other step properties
- Use for targeted corrections

### DELETE Mode
- Removes steps at specified indexes
- Renumbers remaining steps automatically
- Use `deleteIndexes` array to specify which steps

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "testCase": { /* Updated test case object */ },
    "updatedFields": ["name", "priority", "testScript"],
    "message": "Test case CSRP-T123 updated successfully",
    "stepChanges": {
      "mode": "UPDATE",
      "stepsModified": 2,
      "stepsDeleted": 0
    },
    "backup": { /* Original test case if requested */ }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "testCaseId": "CSRP-T123",
    "attemptedUpdates": ["name", "steps"],
    "originalError": "Detailed error from API",
    "status": 400
  }
}
```

## Best Practices

1. **Use Step Operations for Minor Changes**
   - Don't replace all steps just to fix one typo
   - Use UPDATE mode for targeted changes

2. **Create Backups for Major Updates**
   - Set `createBackup: true` for significant changes
   - Useful for audit trails

3. **Validate Before Bulk Updates**
   - Test with one test case first
   - Review the response to ensure correct formatting

4. **Handle Steps Carefully**
   - Remember indexes are 1-based, not 0-based
   - When deleting, consider impact on test flow
   - When appending, ensure logical continuation

5. **Use Appropriate Modes**
   - REPLACE for complete overhauls
   - UPDATE for corrections
   - APPEND for extensions
   - DELETE for cleanup

## Common Use Cases

### Updating Test Status After Review
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "status": "Approved",
    "labels": ["reviewed", "ready"]
  }
}
```

### Fixing Typos in Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "UPDATE",
      "steps": [
        {
          "index": 3,
          "description": "Click 'Submit' button (not 'Sumbit')"
        }
      ]
    }
  }
}
```

### Adding Cleanup Steps
```json
{
  "testCaseId": "CSRP-T123",
  "updates": {
    "stepOperations": {
      "mode": "APPEND",
      "steps": [
        {
          "description": "Clear test data",
          "expectedResult": "Test data removed"
        },
        {
          "description": "Reset environment",
          "expectedResult": "Environment ready for next test"
        }
      ]
    }
  }
}
```

## Error Handling

Common errors and solutions:

1. **Test case not found**
   - Verify test case ID format (PROJECT-T123)
   - Ensure test case exists

2. **Invalid step index**
   - Check that indexes are 1-based
   - Verify step exists before updating

3. **Permission denied**
   - Ensure API token has write permissions
   - Check project access rights

4. **Invalid field values**
   - Verify status/priority values are valid
   - Check required fields in steps