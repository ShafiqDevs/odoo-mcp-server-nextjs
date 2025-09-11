# MCP Setup Instructions for Claude Desktop

## Prerequisites
- Node.js 18+ installed
- Claude Desktop app installed
- This project built (`npm run build` completed)

## Quick Start

### 1. Start the MCP Server

**Option A: Production Mode (Recommended)**
```bash
# Run the startup script
start-mcp-server.bat

# OR manually:
# Terminal 1:
npx convex dev

# Terminal 2:
npm start
```

**Option B: Development Mode**
```bash
# Terminal 1:
npx convex dev

# Terminal 2:
npm run dev
```

### 2. Configure Claude Desktop

1. **Locate your Claude config file:**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add the MCP server configuration:**

```json
{
  "mcpServers": {
    "odoo-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@vercel/mcp-proxy",
        "http://localhost:3000/api/odoo-mcp"
      ]
    }
  }
}
```

3. **Restart Claude Desktop**

### 3. Verify the Connection

In a new Claude conversation, type:
```
Can you list the tools you have available?
```

You should see these Odoo MCP tools:
- `searchKnowledge` - Search the knowledge base
- `connectToOdoo` - Connect to Odoo server  
- `getModelFields` - Get model field definitions
- `createRecords` - Create new records
- `deleteRecord` - Delete records
- `smartSearch` - Search records
- `updateRecord` - Update records

## Environment Variables

Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
CONVEX_DEPLOYMENT=<your-deployment-id>
OPENAI_API_KEY=<your-openai-key>
KNOWLEDGE_API_KEY=<your-api-key-for-admin>
```

## Troubleshooting

### Claude doesn't see the tools
1. Check the server is running: `http://localhost:3000`
2. Verify config file is in the correct location
3. Restart Claude Desktop completely
4. Check for typos in the config

### Server won't start
1. Check port 3000 is not in use
2. Verify all dependencies: `npm install`
3. Rebuild if needed: `npm run build`
4. Check environment variables are set

### Knowledge base is empty
1. Add some resources using the API:
```bash
curl -X POST http://localhost:3000/api/knowledge/resources \
  -H "x-api-key: 123" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"Odoo documentation content...\"}"
```

2. Or run the seed script if available

## Testing the MCP Tools

Once connected, try these example queries in Claude:

1. **Search knowledge:**
   "Search the knowledge base for information about creating sale orders"

2. **Connect to Odoo:**
   "Connect to my Odoo server at https://mycompany.odoo.com"

3. **Search records:**
   "Find all customers in California"

4. **Create records:**
   "Create a new customer named Acme Corp"

## Production Deployment

For production use:
1. Deploy to Vercel or your preferred host
2. Update the MCP proxy URL in Claude config
3. Set production environment variables
4. Enable rate limiting and monitoring

## Support

- Check logs in the terminal for debugging
- See `docs/KNOWLEDGE_BASE_GUIDE.md` for detailed documentation
- Review test files in `tests/` for examples