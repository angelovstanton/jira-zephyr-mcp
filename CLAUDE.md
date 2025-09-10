# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for JIRA Zephyr Scale integration, enabling test management operations through a standardized protocol. Built with TypeScript, uses ESM modules, and communicates via stdio.

## Essential Commands

```bash
# Development
npm run dev          # Watch mode with auto-rebuild
npm run build        # Build TypeScript to dist/
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run lint         # ESLint validation
npm start            # Run built server (node dist/index.js)

# Docker
docker build -t jira-zephyr-mcp:latest .
docker run -d --name jira-zephyr-mcp \
  -e JIRA_BASE_URL=... \
  -e JIRA_USERNAME=... \
  -e JIRA_API_TOKEN=... \
  -e ZEPHYR_API_TOKEN=... \
  jira-zephyr-mcp:latest
```

## Architecture

### Core Components

**MCP Server (src/index.ts:49-579)**
- Stdio-based transport for tool communication
- Tool registration and request handling
- Input validation using Zod schemas before tool execution

**API Clients**
- `JiraClient` (src/clients/jira-client.ts): JIRA REST API v2 integration
- `ZephyrClient` (src/clients/zephyr-client.ts): Zephyr Scale API v2 integration (https://api.zephyrscale.smartbear.com/v2)

**Tool Implementations (src/tools/)**
- Each tool module exports functions that use the appropriate client
- Tools handle: test plans, test cycles, test cases, test execution, JIRA issues
- All tools return structured JSON responses

### Data Flow
1. MCP client sends tool request via stdio → 
2. Server validates input with Zod schema (src/utils/validation.ts) → 
3. Tool function calls appropriate API client → 
4. Client makes authenticated HTTP request → 
5. Response formatted and returned via MCP protocol

### Authentication
- Environment variables loaded via dotenv
- `getJiraHeaders()` returns Basic auth header (base64 encoded username:token)
- `getZephyrHeaders()` returns Bearer token authorization
- Configuration validated on startup (src/utils/config.ts)

## Key Implementation Details

- **TypeScript Config**: ESNext target, ESM modules, strict mode enabled
- **Build System**: tsup for bundling, outputs ESM format with shebang header
- **Error Handling**: McpError with proper error codes, API error mapping
- **Test Scripts**: Support both STEP_BY_STEP (with index, description, expectedResult) and PLAIN_TEXT formats
- **Bulk Operations**: `create_multiple_test_cases` supports batch creation with continueOnError flag

## Available MCP Tools

Core tools exposed via MCP protocol:
- `read_jira_issue` - Fetch JIRA issue with optional field filtering
- `create_test_plan`, `list_test_plans` - Test plan management
- `create_test_cycle`, `list_test_cycles` - Test cycle operations  
- `create_test_case`, `create_multiple_test_cases`, `search_test_cases`, `get_test_case` - Test case CRUD
- `execute_test`, `get_test_execution_status` - Test execution tracking
- `link_tests_to_issues`, `generate_test_report` - Integration and reporting