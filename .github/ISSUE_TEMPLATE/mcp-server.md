---
name: MCP Server Request
about: Request a new MCP server be added to the catalog
title: 'MCP server: [SERVER NAME]'
labels: mcp-server
assignees: ''
---

## Server Information

**Name:** [e.g., brave-search]
**Description:** [Brief description of what the server does]
**Category:** [search / docs / browser / database / deployment / other]

## Transport

**Type:** [stdio / http / sse]

**For stdio servers:**
- Command: [e.g., npx]
- Args: [e.g., -y, @scope/server-name]

**For HTTP servers:**
- URL: [e.g., https://api.example.com/mcp]

## Environment Variables

| Variable | Required? | Description |
|----------|-----------|-------------|
| [e.g., BRAVE_API_KEY] | Yes | API key for authentication |

## Documentation

**Server docs URL:** [Link to README or docs]
**Package/install URL:** [npm / pip / GitHub link]

## Additional Notes

[Any rate limits, special configuration, known issues, etc.]
