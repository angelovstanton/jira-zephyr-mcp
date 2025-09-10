# GitHub Copilot Agent Testing Guide

## Setup Instructions

### 1. Environment Variables
Set these environment variables in your GitHub Copilot or IDE settings:
```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
ZEPHYR_API_TOKEN=your-zephyr-api-token
```

### 2. GitHub Copilot Configuration

#### For VS Code with GitHub Copilot Chat:
1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "GitHub Copilot Chat"
3. Add the MCP configuration:

```json
{
  "github.copilot.chat.mcpServers": {
    "jira-zephyr": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "JIRA_BASE_URL",
        "-e", "JIRA_USERNAME", 
        "-e", "JIRA_API_TOKEN",
        "-e", "ZEPHYR_API_TOKEN",
        "jira-zephyr-mcp:latest"
      ]
    }
  }
}
```

#### For Cursor IDE:
Add to your Cursor settings:
```json
{
  "mcpServers": {
    "jira-zephyr": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "JIRA_BASE_URL",
        "-e", "JIRA_USERNAME",
        "-e", "JIRA_API_TOKEN",
        "-e", "ZEPHYR_API_TOKEN",
        "jira-zephyr-mcp:latest"
      ],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token",
        "ZEPHYR_API_TOKEN": "your-zephyr-token"
      }
    }
  }
}
```

## Testing the Search Functionality

### Test Cases for Search

1. **Search by name (partial match)**
   ```
   @jira-zephyr search for test cases with "Login" in the name in project CSRP
   ```
   Expected query: `{"projectKey": "CSRP", "query": "name ~ Login", "limit": 50}`

2. **Search by exact name**
   ```
   @jira-zephyr find test case named "User Login Test" in project CSRP
   ```
   Expected query: `{"projectKey": "CSRP", "query": "name = \"User Login Test\"", "limit": 50}`

3. **Search by status**
   ```
   @jira-zephyr show all draft test cases in project CSRP
   ```
   Expected query: `{"projectKey": "CSRP", "query": "status = Draft", "limit": 50}`

4. **Search by labels**
   ```
   @jira-zephyr find regression test cases in project CSRP
   ```
   Expected query: `{"projectKey": "CSRP", "query": "labels IN (regression)", "limit": 50}`

5. **Get all test cases (no filter)**
   ```
   @jira-zephyr list all test cases in project CSRP
   ```
   Expected query: `{"projectKey": "CSRP", "limit": 50}`

### Common Query Examples

- `name ~ Login` - Contains "Login" in the name
- `name = "Exact Name"` - Exact match
- `status = Draft` - By status
- `status IN (Draft, Approved)` - Multiple statuses
- `labels IN (regression, smoke)` - By labels
- `priority = High` - By priority
- `owner = "john.doe@company.com"` - By owner

### Troubleshooting

1. **Error: "Invalid search query format"**
   - Check that you're using JQL syntax
   - Don't put quotes around the search term in the ~ operator
   - Correct: `name ~ Login`
   - Incorrect: `name ~ "Login"` (unless Login contains spaces)

2. **Error: "Authentication failed"**
   - Verify your ZEPHYR_API_TOKEN is correct
   - Check token hasn't expired
   - Ensure token has read permissions for the project

3. **Error: "Project not found"**
   - Verify the project key is correct
   - Check Zephyr Scale is enabled for the project
   - Ensure you have permissions to access the project

## Verifying the Docker Container

Test the container locally before using with Copilot:

```bash
# Test the container runs
docker run --rm -i \
  -e JIRA_BASE_URL=https://your-domain.atlassian.net \
  -e JIRA_USERNAME=your-email@company.com \
  -e JIRA_API_TOKEN=your-token \
  -e ZEPHYR_API_TOKEN=your-zephyr-token \
  jira-zephyr-mcp:latest

# Send a test request (in another terminal)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | docker exec -i <container-id> sh
```

## Quick Test Script

Save this as `test-agent.sh`:

```bash
#!/bin/bash

# Set your credentials
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="your-email@company.com"
export JIRA_API_TOKEN="your-jira-token"
export ZEPHYR_API_TOKEN="your-zephyr-token"

# Run the container
docker run --rm -i \
  -e JIRA_BASE_URL \
  -e JIRA_USERNAME \
  -e JIRA_API_TOKEN \
  -e ZEPHYR_API_TOKEN \
  jira-zephyr-mcp:latest
```

## Monitoring Logs

To see debug output when testing:

1. Check Docker logs:
   ```bash
   docker logs <container-id>
   ```

2. The improved error messages will show:
   - Search parameters being used
   - Response status
   - Detailed error information with suggestions

## Next Steps

After successful testing:
1. Document successful query patterns for your team
2. Create templates for common searches
3. Consider creating aliases or snippets for frequently used queries
4. Share the configuration with your team