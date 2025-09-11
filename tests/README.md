# Knowledge Base Test Suite

This directory contains comprehensive tests for the Odoo MCP Server knowledge base integration.

## Test Files

### 1. `integration-test.js`
Comprehensive integration tests covering:
- Complete CRUD cycle
- Search accuracy validation
- Performance testing with concurrent operations
- Error handling and edge cases

**Usage:**
```bash
npm run dev  # Start server on port 3001
node tests/integration-test.js
```

### 2. `performance-test.js`
Dedicated performance testing suite:
- Bulk resource creation (20+ documents)
- Search performance under load
- Concurrent operation handling
- Memory usage monitoring

**Usage:**
```bash
npm run dev  # Start server on port 3001
node tests/performance-test.js
```

### 3. `test-api-routes.js`
API route validation tests:
- CRUD operations via REST API
- Authentication validation
- Response format verification

**Usage:**
```bash
npm run dev  # Start server on port 3001
node tests/test-api-routes.js
```

### 4. `test-search-functionality.js`
Search functionality tests:
- Query relevance testing
- Confidence score validation
- Expected keyword matching

**Usage:**
```bash
npm run dev  # Start server on port 3001
node tests/test-search-functionality.js
```

## Running All Tests

To run all tests sequentially:

```bash
# Start the dev server first
npm run dev

# In another terminal, run tests
npm run test:integration  # If script is configured
# OR manually:
node tests/integration-test.js && node tests/performance-test.js
```

## Test Results Summary

Based on recent test runs:

### Performance Metrics
- **Resource Creation**: ~850ms per resource
- **Search Latency**: ~1500ms per query
- **Bulk Operations**: 1.2 resources/second throughput
- **Concurrent Operations**: Successfully handles 30+ concurrent requests

### Optimization Recommendations
1. **Chunking**: Optimal chunk size is 1500 characters with 200 character overlap
2. **Search Threshold**: 0.75 provides best balance of relevance and recall
3. **Batch Processing**: Process embeddings in batches of 20 for efficiency
4. **Caching**: 5-minute cache TTL for frequently searched queries

## Known Issues
- Dynamic routes ([id]) may require server restart to be recognized
- Embedding generation for very large documents (>10KB) can timeout
- Rate limiting not yet implemented in production

## Future Improvements
- Add automated test runner with CI/CD integration
- Implement load testing with more realistic data
- Add security and penetration testing
- Create visual performance dashboards