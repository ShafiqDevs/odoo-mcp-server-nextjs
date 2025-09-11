# Odoo MCP Server with Knowledge Base

A Next.js-based MCP (Model Context Protocol) server that provides AI agents with tools to interact with Odoo ERP systems, enhanced with a vector-based knowledge base for improved context and guidance.

## Features

### MCP Tools for Odoo
1. **connect** - Establish connection to Odoo server
2. **getModelFields** - Retrieve model field definitions
3. **createRecords** - Create new records in Odoo
4. **deleteRecord** - Delete existing records
5. **smartSearch** - Perform intelligent searches
6. **updateRecord** - Update existing records
7. **searchKnowledge** - Search the knowledge base for Odoo best practices

### Knowledge Base Integration
- **Vector Search**: Semantic search using OpenAI embeddings
- **Automatic Chunking**: Large documents are automatically chunked
- **Confidence Scoring**: Results include relevance scores
- **REST API**: Manage knowledge resources via API
- **Optimized Performance**: Configured for production workloads

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Convex account (free tier available)
- OpenAI API key
- Odoo server (for MCP tools)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd odoo-mcp-server-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-instance.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-id
OPENAI_API_KEY=sk-your-openai-key
KNOWLEDGE_API_KEY=your-secure-api-key
```

4. Initialize Convex:
```bash
npx convex dev
```

5. Run the development server:
```bash
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000) (or port 3001 if 3000 is in use).

## Knowledge Base Usage

### For AI Agents

AI agents can use the `searchKnowledge` tool to find relevant information:

```javascript
const result = await searchKnowledge({
  query: "How to create a sale order?",
  limit: 5,
  threshold: 0.75
});
```

### For Administrators

Manage knowledge resources via REST API:

```bash
# Add a resource
curl -X POST http://localhost:3000/api/knowledge/resources \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"content": "Odoo documentation..."}'

# List resources
curl -X GET http://localhost:3000/api/knowledge/resources \
  -H "x-api-key: your-api-key"

# Update a resource
curl -X PUT http://localhost:3000/api/knowledge/resources/:id \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content..."}'

# Delete a resource
curl -X DELETE http://localhost:3000/api/knowledge/resources/:id \
  -H "x-api-key: your-api-key"
```

## Project Structure

```
odoo-mcp-server-nextjs/
├── app/
│   ├── actions/          # Server actions
│   │   └── knowledge.ts  # Knowledge base operations
│   ├── api/             # REST API routes
│   │   └── knowledge/   # Knowledge base endpoints
│   └── utils/
│       └── tools/       # MCP tool definitions
├── convex/              # Convex database
│   ├── schema.ts        # Database schema
│   ├── resources.ts     # Resource operations
│   └── search.ts        # Vector search
├── lib/
│   ├── chunking.ts      # Text chunking utilities
│   ├── embeddings.ts    # OpenAI embeddings
│   ├── config/
│   │   └── optimization.ts # Performance config
│   └── error-handling.ts   # Error utilities
├── docs/
│   └── KNOWLEDGE_BASE_GUIDE.md # Detailed documentation
└── tests/               # Test suites
    ├── integration-test.js
    ├── performance-test.js
    └── README.md
```

## Testing

Run the comprehensive test suite:

```bash
# Start the dev server first
npm run dev

# Run integration tests
node tests/integration-test.js

# Run performance tests
node tests/performance-test.js

# Run search tests
node tests/test-search-functionality.js
```

## Performance

Based on testing with 100+ resources:
- **Resource Creation**: ~850ms per resource
- **Search Latency**: ~1500ms per query
- **Throughput**: 1.2 resources/second
- **Concurrent Operations**: 30+ supported

## Configuration

Key configurations in `lib/config/optimization.ts`:
- Chunk size: 1500 characters
- Overlap: 200 characters
- Search threshold: 0.75 (default)
- Search limit: 5 results (default)
- Cache TTL: 5 minutes

## Documentation

- [Knowledge Base Guide](docs/KNOWLEDGE_BASE_GUIDE.md) - Comprehensive documentation
- [Test Documentation](tests/README.md) - Testing guide
- [Project Specs](PROJECT_SPECS.md) - Implementation specifications

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build
CMD ["npm", "start"]
```

## Security

- API key authentication for management endpoints
- Read-only access for AI agents
- Input validation and sanitization
- Rate limiting configuration available
- Error messages don't expose sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [Report bugs or request features]
- Documentation: See `docs/` directory
- API Health: `GET /api/knowledge/resources` with API key

## Acknowledgments

- Built with Next.js 15
- Vector storage by Convex
- Embeddings by OpenAI
- MCP protocol by Anthropic