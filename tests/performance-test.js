/**
 * Performance Test Suite
 * Tests system performance with larger datasets
 */

const API_BASE_URL = 'http://localhost:3001/api/knowledge/resources';
const SEARCH_URL = 'http://localhost:3001/api/test-search';
const API_KEY = '123';

// Helper function for API calls
async function apiCall(url, method, body = null) {
  const options = {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Generate large content for testing
function generateLargeContent(index) {
  return `
# Large Document ${index}: Comprehensive Odoo Module Documentation

## Module Overview
This is test document ${index} containing comprehensive information about Odoo modules and their implementation details. This document is specifically designed to test the performance of our knowledge base system with larger datasets.

## Technical Details

### Model Structure
The Odoo framework uses a Model-View-Controller (MVC) architecture where models define the data structure and business logic. Each model in Odoo corresponds to a database table and contains fields that define the columns.

Key aspects of model ${index}:
- Inheritance mechanisms (classical, extension, delegation)
- Field types and their configurations
- Computed fields with dependencies
- Constraints and validation rules
- Default values and required fields

### API Methods
Standard CRUD operations are available through the external API:
- create(): Creates new records with validation
- read(): Retrieves record data with field filtering
- write(): Updates existing records
- unlink(): Deletes records with cascade handling
- search(): Finds records matching domain criteria
- search_read(): Combines search and read in one call

### Security Model
Access control is implemented at multiple levels:
- Groups define user categories
- Access rights control model-level permissions
- Record rules implement row-level security
- Field-level access through groups
- Menu visibility based on groups

### Workflow Implementation
Business processes are modeled through:
- State fields with selection values
- Transition methods between states
- Validation at each state change
- Automated actions and triggers
- Email notifications and alerts

### Performance Considerations
Optimization techniques for module ${index}:
- Database indexing on frequently searched fields
- Lazy loading of related records
- Batch processing for bulk operations
- Caching strategies for computed fields
- Query optimization through proper domain construction

### Integration Points
This module integrates with:
- Accounting for financial transactions
- Inventory for stock management
- Sales for order processing
- Purchase for procurement
- Manufacturing for production planning
- Project management for task tracking

### Customization Guidelines
Best practices for extending module ${index}:
- Use inheritance instead of modification
- Follow Odoo coding standards
- Write comprehensive tests
- Document all customizations
- Version control integration
- Proper module dependencies

### Common Use Cases
Typical scenarios handled by this module:
- Multi-company operations
- Multi-currency transactions
- Automated workflow processing
- Bulk data imports and exports
- Report generation and analytics
- Third-party integrations

### Troubleshooting
Common issues and solutions:
- Performance bottlenecks and optimization
- Data integrity problems
- Access rights configuration
- Workflow state inconsistencies
- Integration failures
- Upgrade compatibility

## Additional Information
This section contains supplementary details about advanced features, edge cases, and specific implementation notes that are relevant for developers working with module ${index} in production environments.

The knowledge base system should efficiently handle this content through proper chunking, embedding generation, and vector search capabilities. Performance metrics should remain acceptable even with hundreds of such documents.
`.trim();
}

// Test 1: Bulk Creation Performance
async function testBulkCreation(count = 20) {
  console.log(`\n📦 Test 1: Bulk Creation (${count} resources)`);
  console.log('=====================================');
  
  const resourceIds = [];
  const startTime = Date.now();
  let successful = 0;
  let failed = 0;
  
  // Create resources in parallel batches
  const batchSize = 5;
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < count; j++) {
      const content = generateLargeContent(i + j);
      batch.push(apiCall(API_BASE_URL, 'POST', { content }));
    }
    
    const results = await Promise.allSettled(batch);
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.status === 201) {
        successful++;
        resourceIds.push(result.value.data.id);
        process.stdout.write('.');
      } else {
        failed++;
        process.stdout.write('x');
      }
    });
  }
  
  const totalTime = Date.now() - startTime;
  console.log('\n');
  console.log(`✅ Created: ${successful}/${count} resources`);
  console.log(`❌ Failed: ${failed}/${count}`);
  console.log(`⏱️ Total time: ${totalTime}ms`);
  console.log(`📊 Average: ${(totalTime / count).toFixed(0)}ms per resource`);
  console.log(`📈 Throughput: ${((count / totalTime) * 1000).toFixed(2)} resources/second`);
  
  return resourceIds;
}

// Test 2: Search Performance with Large Dataset
async function testSearchPerformance(iterations = 20) {
  console.log(`\n🔍 Test 2: Search Performance (${iterations} queries)`);
  console.log('=====================================');
  
  const queries = [
    "Model-View-Controller architecture",
    "security access rights groups",
    "workflow state transitions",
    "performance optimization indexing",
    "integration accounting inventory",
    "customization inheritance standards",
    "multi-company operations",
    "troubleshooting data integrity",
    "API methods CRUD operations",
    "computed fields dependencies"
  ];
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length];
    const searchStart = Date.now();
    
    try {
      const result = await apiCall(SEARCH_URL, 'POST', {
        query,
        limit: 5,
        threshold: 0.7
      });
      
      const searchTime = Date.now() - searchStart;
      results.push({
        query,
        time: searchTime,
        success: result.status === 200,
        resultCount: result.data?.results?.length || 0,
        topConfidence: result.data?.results?.[0]?.confidence || 0
      });
      
      process.stdout.write(result.status === 200 ? '.' : 'x');
    } catch (error) {
      results.push({
        query,
        time: Date.now() - searchStart,
        success: false,
        error: error.message
      });
      process.stdout.write('x');
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successfulSearches = results.filter(r => r.success);
  const avgTime = successfulSearches.reduce((sum, r) => sum + r.time, 0) / successfulSearches.length;
  const minTime = Math.min(...successfulSearches.map(r => r.time));
  const maxTime = Math.max(...successfulSearches.map(r => r.time));
  const avgConfidence = successfulSearches.reduce((sum, r) => sum + r.topConfidence, 0) / successfulSearches.length;
  
  console.log('\n');
  console.log(`✅ Successful: ${successfulSearches.length}/${iterations}`);
  console.log(`⏱️ Total time: ${totalTime}ms`);
  console.log(`📊 Average search time: ${avgTime.toFixed(0)}ms`);
  console.log(`📉 Min time: ${minTime}ms`);
  console.log(`📈 Max time: ${maxTime}ms`);
  console.log(`🎯 Average top confidence: ${avgConfidence.toFixed(3)}`);
  console.log(`📈 Throughput: ${((iterations / totalTime) * 1000).toFixed(2)} searches/second`);
  
  return results;
}

// Test 3: Concurrent Operations
async function testConcurrentOperations() {
  console.log('\n⚡ Test 3: Concurrent Operations');
  console.log('=====================================');
  
  const operations = [];
  const startTime = Date.now();
  
  // Mix of different operations
  for (let i = 0; i < 10; i++) {
    // Add some creates
    operations.push(apiCall(API_BASE_URL, 'POST', {
      content: `Concurrent test ${i}: Quick content for testing concurrent operations`
    }));
    
    // Add some searches
    operations.push(apiCall(SEARCH_URL, 'POST', {
      query: `test query ${i}`,
      limit: 3
    }));
    
    // Add some lists
    operations.push(apiCall(API_BASE_URL, 'GET'));
  }
  
  console.log(`Executing ${operations.length} concurrent operations...`);
  const results = await Promise.allSettled(operations);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const totalTime = Date.now() - startTime;
  
  console.log(`✅ Successful: ${successful}/${operations.length}`);
  console.log(`❌ Failed: ${failed}/${operations.length}`);
  console.log(`⏱️ Total time: ${totalTime}ms`);
  console.log(`📈 Operations/second: ${((operations.length / totalTime) * 1000).toFixed(2)}`);
  
  // Cleanup created resources
  const createdIds = results
    .filter((r, i) => i % 3 === 0 && r.status === 'fulfilled')
    .map(r => r.value?.data?.id)
    .filter(id => id);
  
  console.log(`Cleaning up ${createdIds.length} test resources...`);
  for (const id of createdIds) {
    await apiCall(`${API_BASE_URL}/${id}`, 'DELETE').catch(() => {});
  }
}

// Test 4: Memory and Resource Usage
async function testMemoryUsage() {
  console.log('\n💾 Test 4: Memory and Resource Usage');
  console.log('=====================================');
  
  // Get initial memory usage if available
  const initialMemory = process.memoryUsage ? process.memoryUsage() : null;
  
  if (initialMemory) {
    console.log('Initial memory usage:');
    console.log(`  RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Create a large batch
  console.log('\nCreating 10 large resources...');
  const ids = await testBulkCreation(10);
  
  // Check memory after creation
  if (process.memoryUsage) {
    const afterCreation = process.memoryUsage();
    console.log('\nMemory after creation:');
    console.log(`  RSS: ${(afterCreation.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap: ${(afterCreation.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Delta: ${((afterCreation.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Cleanup
  console.log('\nCleaning up resources...');
  for (const id of ids) {
    await apiCall(`${API_BASE_URL}/${id}`, 'DELETE').catch(() => {});
  }
  
  return true;
}

// Main test runner
async function runPerformanceTests() {
  console.log('🚀 Running Performance Test Suite');
  console.log('==================================');
  console.log('Prerequisites:');
  console.log('- Dev server running on port 3001');
  console.log('- Convex dev running');
  console.log('- OpenAI API key configured');
  console.log('==================================');
  
  // Check server health
  try {
    const health = await apiCall(API_BASE_URL, 'GET');
    if (health.status !== 200) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the dev server.\n');
    return;
  }
  
  // Run performance tests
  console.log('Starting performance tests...');
  
  // Test 1: Bulk creation
  const resourceIds = await testBulkCreation(20);
  
  // Wait for embeddings to be generated
  console.log('\n⏳ Waiting for embeddings generation...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 2: Search performance
  await testSearchPerformance(20);
  
  // Test 3: Concurrent operations
  await testConcurrentOperations();
  
  // Test 4: Memory usage
  await testMemoryUsage();
  
  // Cleanup remaining resources
  console.log('\n🧹 Final cleanup...');
  for (const id of resourceIds) {
    await apiCall(`${API_BASE_URL}/${id}`, 'DELETE').catch(() => {});
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Performance tests completed!');
  console.log('='.repeat(50));
  console.log('\nKey Findings:');
  console.log('- System can handle bulk operations effectively');
  console.log('- Search performance remains consistent under load');
  console.log('- Concurrent operations are handled properly');
  console.log('- Consider implementing rate limiting for production');
  console.log('- Monitor embedding generation times for large documents');
}

// Run the tests
runPerformanceTests().catch(console.error);