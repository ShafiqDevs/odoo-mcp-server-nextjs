# Odoo MCP Server Knowledge Base Guide

## Overview

The Knowledge Base integration enhances the Odoo MCP Server by providing AI agents with contextual information about Odoo tools and best practices. It uses Convex for vector storage and OpenAI embeddings for semantic search.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   AI Agents     │────▶│  MCP Tools       │────▶│   Odoo      │
│                 │     │                  │     │   Server    │
└────────┬────────┘     └──────────────────┘     └─────────────┘
         │                      
         │ searchKnowledge      
         ▼                      
┌─────────────────┐     ┌──────────────────┐     
│  Next.js Server │────▶│     Convex       │     
│    Actions      │     │   Vector DB      │     
└─────────────────┘     └──────────────────┘     
         ▲                      
         │ API Routes           
         │                      
┌─────────────────┐            
│  Admin/Users    │            
│   (API Key)     │            
└─────────────────┘            
```

## Features

### For AI Agents
- **searchKnowledge Tool**: Semantic search across all knowledge resources
- Confidence scoring for search results
- Contextual information about Odoo models and operations
- Best practices and examples

### For Administrators
- REST API for knowledge management
- Add, update, and delete resources
- Automatic text chunking and embedding generation
- Simple API key authentication

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Convex account (free tier works)
- OpenAI API key

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-instance.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-id
OPENAI_API_KEY=sk-your-api-key
KNOWLEDGE_API_KEY=your-secure-api-key
```

### Database Schema
The system uses two Convex tables:

1. **resources**: Stores complete knowledge documents
   - `_id`: Unique identifier
   - `content`: Full text content

2. **embeddings**: Stores chunked text with vector embeddings
   - `_id`: Unique identifier
   - `resource_id`: Reference to parent resource
   - `content`: Chunk text
   - `embedding`: 1536-dimensional vector

## API Reference

### Authentication
All API endpoints require an API key in the header:
```
x-api-key: your-api-key
```

### Endpoints

#### POST /api/knowledge/resources
Create a new knowledge resource.

**Request:**
```json
{
  "content": "Complete documentation text..."
}
```

**Response:**
```json
{
  "id": "j97...",
  "success": true,
  "message": "Resource added successfully"
}
```

#### GET /api/knowledge/resources
List all knowledge resources.

**Response:**
```json
{
  "success": true,
  "resources": [...],
  "count": 10
}
```

#### PUT /api/knowledge/resources/:id
Update an existing resource.

**Request:**
```json
{
  "content": "Updated documentation text..."
}
```

#### DELETE /api/knowledge/resources/:id
Delete a resource and its embeddings.

## MCP Tool Usage

### searchKnowledge Tool

The `searchKnowledge` tool is available to AI agents for semantic search:

```typescript
{
  name: "searchKnowledge",
  description: "Search the knowledge base for Odoo-related information",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      limit: {
        type: "number",
        description: "Maximum results (default: 5)"
      },
      threshold: {
        type: "number",
        description: "Minimum confidence (0-1, default: 0.75)"
      }
    },
    required: ["query"]
  }
}
```

**Example usage by AI agent:**
```
Query: "How to create a sale order in Odoo?"
Results: 
1. (0.892) Creating sale orders requires partner_id...
2. (0.845) Sale order workflow includes quotation...
```

## Performance Optimization

### Configuration
Optimizations are configured in `lib/config/optimization.ts`:

- **Chunking**: 1500 chars with 200 char overlap
- **Search**: Default threshold 0.75, limit 5
- **Embeddings**: Batch size 20, max concurrent 5
- **Caching**: 5-minute TTL for search results

### Performance Metrics
Based on testing with 100+ resources:
- Resource creation: ~850ms per resource
- Search latency: ~1500ms per query
- Throughput: 1.2 resources/second
- Concurrent operations: 30+ supported

## Best Practices

### Content Guidelines
1. **Structure**: Use clear headings and sections
2. **Examples**: Include code examples and use cases
3. **Keywords**: Use consistent terminology
4. **Length**: Ideal resource size is 5-10KB

### Search Optimization
1. **Specific queries**: More specific queries yield better results
2. **Keywords**: Include model names and field names
3. **Context**: Provide context in queries for better matching

### API Usage
1. **Batch operations**: Process multiple resources together
2. **Error handling**: Implement retry logic for transient failures
3. **Rate limiting**: Respect rate limits (30 req/min for mutations)

## Troubleshooting

### Common Issues

**Issue**: Search returns no results
- Check if resources exist: `GET /api/knowledge/resources`
- Verify embeddings were generated
- Lower the threshold parameter

**Issue**: Slow search performance
- Check OpenAI API key validity
- Verify Convex connection
- Consider implementing caching

**Issue**: API authentication fails
- Verify x-api-key header is present
- Check API key matches environment variable
- Ensure no trailing spaces in key

## Development

### Running Tests
```bash
# Integration tests
node tests/integration-test.js

# Performance tests
node tests/performance-test.js

# Search functionality tests
node tests/test-search-functionality.js
```

### Adding New Features
1. Update server actions in `app/actions/knowledge.ts`
2. Modify Convex functions if needed
3. Update API routes in `app/api/knowledge/`
4. Add tests for new functionality

## Security Considerations

1. **API Keys**: Store securely, rotate regularly
2. **Input Validation**: All inputs are validated and sanitized
3. **Rate Limiting**: Implement in production
4. **Access Control**: Knowledge base is read-only for AI agents
5. **Error Messages**: Sensitive information is not exposed

## Deployment

### Production Checklist
- [ ] Set strong API keys
- [ ] Configure rate limiting
- [ ] Enable monitoring
- [ ] Set up error tracking
- [ ] Configure backups
- [ ] Test failover scenarios

### Environment-Specific Settings
```typescript
// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable caching
  // Increase rate limits
  // Use production error messages
}
```

## Support & Maintenance

### Monitoring
- Track search query patterns
- Monitor embedding generation times
- Watch for rate limit violations
- Alert on error rates

### Maintenance Tasks
- Regular content updates
- Embedding regeneration if needed
- Database optimization
- Performance tuning

## Future Enhancements

Planned improvements:
- [ ] Multi-language support
- [ ] Advanced caching strategies
- [ ] Real-time content updates
- [ ] Analytics dashboard
- [ ] Backup and restore functionality
- [ ] Version control for resources

## Contact & Support

For issues or questions:
- GitHub Issues: [Project Repository]
- Documentation: This guide
- API Status: Check health endpoint