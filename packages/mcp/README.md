# @arachnejs/mcp

Model Context Protocol kernel for Arachne. Every `@arachnejs/*` package exports
`./mcp`; this package composes them into stdio or Streamable HTTP servers.

```bash
# stdio (Cursor / Claude Desktop)
bunx arachne-mcp

# specific modules
bunx arachne-mcp --modules core,signals,jsx
```

See [ADR 0007](../../docs/adr/0007-mcp-everywhere.md).
