# Odoo MCP Knowledge Base Integration Plan with Convex

## Overview
Integrate a Convex-powered knowledge base to enhance AI agents' ability to use Odoo tools effectively. The system will have:
- **Read-only** `searchKnowledge` tool exposed to AI agents via MCP
- **Server actions** for knowledge management (add, update, delete) accessible via API routes
- **Simple API key authentication** for management routes
- **Automatic embedding generation** when resources are added/updated

## Database Structure

### **Resources Table**
- `id`: Unique identifier (Convex ID)
- `content`: Full knowledge document (text)

### **Embeddings Table**
- `id`: Unique identifier (Convex ID)
- `resource_id`: Reference to resources table
- `content`: Text chunk from the resource
- `embedding`: Vector embedding (1536 dimensions for OpenAI)
- Vector index on embedding field for semantic search

## Implementation Phases

### **Phase 1: Convex Setup & Database Schema**
1. Install dependencies:
   ```bash
   npm install convex openai
   ```
2. Initialize Convex project:
   ```bash
   npx convex dev
   ```
3. Create Convex schema (`convex/schema.ts`):
   ```typescript
   import { defineSchema, defineTable } from "convex/server";
   import { v } from "convex/values";

   export default defineSchema({
     resources: defineTable({
       content: v.string(),
     }),
     
     embeddings: defineTable({
       resource_id: v.id("resources"),
       content: v.string(),
       embedding: v.array(v.float64()),
     }).vectorIndex("by_embedding", {
       vectorField: "embedding",
       dimensions: 1536,
     }),
   });
   ```
4. Set up environment variables in `.env.local`:
   ```
   CONVEX_DEPLOYMENT=
   CONVEX_URL=
   OPENAI_API_KEY=
   KNOWLEDGE_API_KEY=your-secret-api-key-here
   ```

### **Phase 2: Convex Server Actions**
1. Create resource management actions (`convex/resources.ts`):
   - **addResource**: 
     - Add new resource to database
     - Generate chunks of the resource
     - Create embeddings for each chunk
     - Store embeddings in embeddings table
   - **updateResource**:
     - Update resource content
     - Delete old embeddings
     - Generate new chunks and embeddings
   - **deleteResource**:
     - Delete resource by ID
     - Delete all associated embeddings

2. Create search action (`convex/search.ts`):
   - **searchKnowledge**:
     - Accept query string
     - Generate query embedding
     - Perform vector search
     - Return relevant chunks with scores

3. Create utilities (`lib/chunking.ts` & `lib/embeddings.ts`):
   - Text chunking logic (max 8K tokens)
   - OpenAI embedding generation
   - Chunk overlap strategy

### **Phase 3: API Routes with Simple Authentication**
1. Create API key validation utility (`lib/api-auth.ts`):
   ```typescript
   export function validateApiKey(request: Request): boolean {
     const apiKey = request.headers.get('x-api-key');
     return apiKey === process.env.KNOWLEDGE_API_KEY;
   }
   ```

2. Create API routes (`app/api/knowledge/`):
   - **POST `/api/knowledge/resources`** - Add new resource
   - **PUT `/api/knowledge/resources/[id]`** - Update resource
   - **DELETE `/api/knowledge/resources/[id]`** - Delete resource
   - **GET `/api/knowledge/resources`** - List all resources (optional)

3. Implement route handlers with API key check:
   ```typescript
   // Example for POST route
   export async function POST(request: Request) {
     // Check API key
     if (!validateApiKey(request)) {
       return new Response('Unauthorized', { status: 401 });
     }
     
     // Process request...
   }
   ```

### **Phase 4: Search Knowledge MCP Tool**
1. Create `searchKnowledge` tool (`app/utils/tools/knowledge/search_knowledge.ts`):
   ```typescript
   {
     name: 'searchKnowledge',
     description: 'Search for Odoo models, fields, queries, and best practices',
     inputSchema: {
       query: string,        // Natural language search query
       limit?: number,       // Max results (default: 5)
       threshold?: number,   // Similarity threshold (0-1)
     },
     output: {
       results: Array<{
         content: string,    // Relevant knowledge chunk
         confidence: number, // Similarity score
         resource_id: string // Source reference
       }>
     }
   }
   ```

2. Update MCP route (`app/api/odoo-mcp/[transport]/route.ts`):
   - Import searchKnowledge tool
   - Register with MCP server
   - Add to capabilities
   - No authentication needed (read-only for AI agents)

### **Phase 5: Testing & Optimization**
1. Test Convex actions:
   - Resource CRUD operations
   - Embedding generation
   - Vector search accuracy
2. Test API routes:
   - API key validation
   - Error handling
   - Response times
3. Test MCP integration:
   - searchKnowledge tool
   - Integration with existing Odoo tools
4. Performance optimization:
   - Chunk size tuning
   - Vector search thresholds
   - Caching strategies

### **Phase 6: Documentation & Deployment**
1. Create documentation:
   - API route documentation with authentication
   - searchKnowledge usage guide
   - Knowledge content guidelines
2. Set up monitoring:
   - Track API usage
   - Monitor search queries
   - Log errors and performance
3. Deploy and validate

## File Structure
```
odoo-mcp-server-nextjs/
├── convex/
│   ├── schema.ts           # Database schema
│   ├── resources.ts        # Resource management actions
│   ├── search.ts          # Vector search action
│   └── _generated/        # Auto-generated files
├── app/
│   ├── api/
│   │   ├── odoo-mcp/
│   │   │   └── [transport]/
│   │   │       └── route.ts # Updated with searchKnowledge
│   │   └── knowledge/      # Knowledge management API
│   │       ├── resources/
│   │       │   ├── route.ts           # POST: Add resource
│   │       │   └── [id]/
│   │       │       └── route.ts       # PUT/DELETE: Update/Delete
│   └── utils/
│       └── tools/
│           ├── knowledge/
│           │   └── search_knowledge.ts  # MCP search tool
│           └── odoo/        # Existing tools
├── lib/
│   ├── api-auth.ts         # API key validation
│   ├── embeddings.ts       # OpenAI embedding utilities
│   ├── chunking.ts         # Text chunking utilities
│   └── convex-client.ts    # Convex client setup
└── PROJECT_SPECS.md        # This plan document
```

## Server Actions Specification

### addResource Action
```typescript
async function addResource({ content }: { content: string }) {
  // 1. Insert resource into resources table
  // 2. Generate chunks from content
  // 3. For each chunk:
  //    - Generate embedding via OpenAI
  //    - Store in embeddings table with resource_id
  // 4. Return resource ID
}
```

### updateResource Action
```typescript
async function updateResource({ id, content }: { id: Id, content: string }) {
  // 1. Update resource in resources table
  // 2. Delete existing embeddings for resource_id
  // 3. Generate new chunks from updated content
  // 4. Generate and store new embeddings
  // 5. Return success status
}
```

### deleteResource Action
```typescript
async function deleteResource({ id }: { id: Id }) {
  // 1. Delete all embeddings with resource_id
  // 2. Delete resource from resources table
  // 3. Return success status
}
```

## API Routes Specification

### Authentication
All knowledge management routes require API key in header:
```
x-api-key: your-secret-api-key-here
```

### POST /api/knowledge/resources
- **Purpose**: Add new knowledge resource
- **Headers**: `x-api-key: <API_KEY>`
- **Body**: `{ content: string }`
- **Response**: `{ id: string, success: boolean }`

### PUT /api/knowledge/resources/[id]
- **Purpose**: Update existing resource
- **Headers**: `x-api-key: <API_KEY>`
- **Body**: `{ content: string }`
- **Response**: `{ success: boolean }`

### DELETE /api/knowledge/resources/[id]
- **Purpose**: Delete resource and embeddings
- **Headers**: `x-api-key: <API_KEY>`
- **Response**: `{ success: boolean }`

## Usage Example

### Adding Knowledge via API
```bash
curl -X POST http://localhost:3000/api/knowledge/resources \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{
    "content": "res.partner is the main model for managing contacts..."
  }'
```

### AI Agent Searching Knowledge
```javascript
// Via MCP tool (no authentication needed)
await searchKnowledge({
  query: "How to search for partners in Odoo?",
  limit: 5
});
```

## Security Considerations
- Knowledge base is **read-only** for AI agents (via MCP)
- Management operations require API key (via API routes)
- API key stored in environment variable
- No update/delete operations exposed via MCP
- Input validation on all API routes

## Success Metrics
- AI agents successfully query knowledge before using Odoo tools
- Secure and efficient resource management via API routes
- Fast and accurate vector search results
- Reduced errors in Odoo tool usage

## Testing Strategy
Each phase will include:
1. Unit tests for functions
2. Integration tests for Convex actions
3. API route testing with API key validation
4. MCP tool integration testing
5. End-to-end workflow validation
6. Commit after successful tests

## Current Status
- [ ] Phase 1: Convex Setup & Database Schema
- [ ] Phase 2: Convex Server Actions
- [ ] Phase 3: API Routes with Simple Authentication
- [ ] Phase 4: Search Knowledge MCP Tool
- [ ] Phase 5: Testing & Optimization
- [ ] Phase 6: Documentation & Deployment