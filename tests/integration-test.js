/**
 * Comprehensive Integration Test Suite
 * Tests the complete knowledge base system end-to-end
 */

const API_BASE_URL = 'http://localhost:3001/api/knowledge/resources';
const SEARCH_URL = 'http://localhost:3001/api/test-search';
const API_KEY = '123';

// Test data for different scenarios
const testScenarios = {
  shortContent: {
    name: "Short content (no chunking needed)",
    content: "Odoo is an ERP system. It has many modules.",
    expectedChunks: 1
  },
  longContent: {
    name: "Long content (requires chunking)",
    content: `# Comprehensive Odoo Guide

## Introduction
Odoo is a suite of open-source business apps that cover all your company needs: CRM, eCommerce, accounting, inventory, point of sale, project management, etc. Odoo's unique value proposition is to be at the same time very easy to use and fully integrated.

## Core Modules

### Sales Management
The sales module handles the complete sales workflow from quotation to invoicing. Key features include:
- Quotation templates with dynamic pricing
- Product configurator for complex products
- Multiple price lists and discount strategies
- Integration with eCommerce platform
- Automated follow-ups and reminders
- Sales team performance dashboards
- Commission calculation and reporting
- Multi-currency support
- Contract management
- Subscription billing

### Inventory Management
Advanced inventory control with multiple warehouse support:
- Real-time stock valuation (FIFO, LIFO, Average)
- Barcode scanning integration
- Automated replenishment rules
- Drop-shipping and cross-docking
- Quality control points
- Lot and serial number tracking
- Expiry date management
- Multi-step routes (pick, pack, ship)
- Inventory adjustments and cycle counting
- Landed costs distribution

### Manufacturing (MRP)
Complete manufacturing resource planning:
- Bill of Materials (BoM) management
- Work center capacity planning
- Manufacturing orders and work orders
- Quality control and quality alerts
- Maintenance management
- Overall Equipment Effectiveness (OEE)
- Planning and forecasting
- Subcontracting management
- Product lifecycle management
- Cost analysis and reporting

### Accounting
Full-featured accounting system:
- Multi-company consolidation
- Automated bank synchronization
- Tax report generation
- Asset management and depreciation
- Budget management
- Analytic accounting
- Inter-company transactions
- Financial report builder
- Audit trail and reconciliation
- Payment matching and follow-up

### Human Resources
Comprehensive HR management:
- Employee database and contracts
- Attendance tracking and timesheets
- Leave management and approvals
- Expense management
- Recruitment pipeline
- Performance appraisals
- Skills management
- Fleet management
- Document management
- Payroll integration

### Project Management
Agile project management tools:
- Gantt charts and Kanban boards
- Task dependencies and milestones
- Time tracking and billing
- Resource allocation
- Customer portal
- Document sharing
- Forecasting and planning
- Profitability analysis
- Integration with timesheets
- Automated alerts and SLA

## Technical Architecture

### Database Structure
Odoo uses PostgreSQL as its database backend. Key technical points:
- Object-Relational Mapping (ORM) layer
- Automatic database schema updates
- Multi-database support
- Connection pooling
- Query optimization
- Index management

### API and Integration
Multiple integration options:
- XML-RPC and JSON-RPC APIs
- REST API through controllers
- External API framework
- Webhook support
- Import/Export tools
- ETL capabilities

### Security Model
Comprehensive security features:
- Record-level access rules
- Field-level security
- Group-based permissions
- Multi-factor authentication
- Audit logging
- Data encryption
- GDPR compliance tools

## Best Practices

### Performance Optimization
- Use indexed fields in searches
- Implement proper caching strategies
- Optimize database queries
- Use computed fields wisely
- Implement pagination for large datasets
- Monitor slow queries
- Regular database maintenance

### Development Guidelines
- Follow Odoo coding standards
- Write comprehensive tests
- Document your code
- Use inheritance properly
- Implement proper error handling
- Version control best practices
- Module dependency management

### Deployment Strategies
- Use staging environments
- Implement CI/CD pipelines
- Database backup strategies
- Load balancing configuration
- Monitoring and alerting
- Disaster recovery planning
- Security hardening

This guide provides a comprehensive overview of Odoo's capabilities and best practices for implementation and maintenance.`.substring(0, 8000),
    expectedChunks: 3 // Should create multiple chunks
  },
  specialCharacters: {
    name: "Content with special characters",
    content: `Special chars test: "quotes", 'apostrophes', <tags>, &entities;, 
    percentages: 50%, math: 2+2=4, emails: test@example.com, 
    code: if (x > 0) { return true; }`,
    expectedChunks: 1
  }
};

// Helper function for API calls
async function apiCall(url, method, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...headers
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Test 1: Complete CRUD cycle
async function testCompleteCRUD() {
  console.log('\n🔄 Test 1: Complete CRUD Cycle');
  console.log('================================');
  
  try {
    // CREATE
    console.log('1. Creating resource...');
    const createResult = await apiCall(API_BASE_URL, 'POST', {
      content: testScenarios.longContent.content
    });
    
    if (createResult.status !== 201) {
      throw new Error(`Create failed: ${createResult.data.error}`);
    }
    
    const resourceId = createResult.data.id;
    console.log(`   ✅ Created with ID: ${resourceId}`);
    
    // Wait for embeddings to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // READ (List)
    console.log('2. Reading resources...');
    const listResult = await apiCall(API_BASE_URL, 'GET');
    
    if (listResult.status !== 200) {
      throw new Error(`List failed: ${listResult.data.error}`);
    }
    
    const found = listResult.data.resources.find(r => r._id === resourceId);
    if (!found) {
      throw new Error('Created resource not found in list');
    }
    console.log(`   ✅ Found in list (total: ${listResult.data.count})`);
    
    // UPDATE
    console.log('3. Updating resource...');
    const updateResult = await apiCall(`${API_BASE_URL}/${resourceId}`, 'PUT', {
      content: testScenarios.shortContent.content
    });
    
    if (updateResult.status !== 200) {
      throw new Error(`Update failed: ${updateResult.data.error}`);
    }
    console.log('   ✅ Updated successfully');
    
    // DELETE
    console.log('4. Deleting resource...');
    const deleteResult = await apiCall(`${API_BASE_URL}/${resourceId}`, 'DELETE');
    
    if (deleteResult.status !== 200) {
      throw new Error(`Delete failed: ${deleteResult.data.error}`);
    }
    console.log('   ✅ Deleted successfully');
    
    // Verify deletion
    console.log('5. Verifying deletion...');
    const verifyResult = await apiCall(API_BASE_URL, 'GET');
    const stillExists = verifyResult.data.resources.find(r => r._id === resourceId);
    
    if (stillExists) {
      throw new Error('Resource still exists after deletion');
    }
    console.log('   ✅ Confirmed deleted');
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// Test 2: Search accuracy with different queries
async function testSearchAccuracy() {
  console.log('\n🔍 Test 2: Search Accuracy');
  console.log('================================');
  
  const searchTests = [
    {
      query: "What is Odoo?",
      shouldFind: ["ERP", "business", "modules"],
      minConfidence: 0.7
    },
    {
      query: "inventory management features",
      shouldFind: ["stock", "warehouse", "barcode"],
      minConfidence: 0.75
    },
    {
      query: "accounting and finance",
      shouldFind: ["accounting", "tax", "bank"],
      minConfidence: 0.75
    }
  ];
  
  let passed = 0;
  
  for (const test of searchTests) {
    console.log(`\nQuery: "${test.query}"`);
    
    try {
      const result = await apiCall(SEARCH_URL, 'POST', {
        query: test.query,
        limit: 3,
        threshold: test.minConfidence
      });
      
      if (result.status !== 200) {
        console.log(`   ❌ Search failed: ${result.status}`);
        continue;
      }
      
      if (!result.data.success || !result.data.results || result.data.results.length === 0) {
        console.log('   ❌ No results found');
        continue;
      }
      
      const topResult = result.data.results[0];
      console.log(`   Confidence: ${topResult.confidence.toFixed(3)}`);
      
      if (topResult.confidence < test.minConfidence) {
        console.log(`   ❌ Confidence too low (min: ${test.minConfidence})`);
        continue;
      }
      
      const content = topResult.content.toLowerCase();
      const foundKeywords = test.shouldFind.filter(kw => 
        content.includes(kw.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        console.log(`   ✅ Found keywords: ${foundKeywords.join(', ')}`);
        passed++;
      } else {
        console.log(`   ❌ Expected keywords not found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Passed: ${passed}/${searchTests.length}`);
  return passed === searchTests.length;
}

// Test 3: Performance with multiple resources
async function testPerformance() {
  console.log('\n⚡ Test 3: Performance Testing');
  console.log('================================');
  
  const resourceIds = [];
  
  try {
    // Create multiple resources
    console.log('1. Creating 5 resources...');
    const startCreate = Date.now();
    
    for (let i = 1; i <= 5; i++) {
      const result = await apiCall(API_BASE_URL, 'POST', {
        content: `Test resource ${i}: ${testScenarios.shortContent.content}`
      });
      
      if (result.status === 201) {
        resourceIds.push(result.data.id);
      }
    }
    
    const createTime = Date.now() - startCreate;
    console.log(`   ✅ Created ${resourceIds.length} resources in ${createTime}ms`);
    console.log(`   Average: ${(createTime / resourceIds.length).toFixed(0)}ms per resource`);
    
    // Wait for embeddings
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test search performance
    console.log('2. Testing search performance...');
    const searchQueries = [
      "Test resource 1",
      "Test resource 3",
      "Test resource 5",
      "ERP system",
      "Odoo modules"
    ];
    
    const startSearch = Date.now();
    let searchCount = 0;
    
    for (const query of searchQueries) {
      const result = await apiCall(SEARCH_URL, 'POST', {
        query,
        limit: 3
      });
      
      if (result.status === 200) {
        searchCount++;
      }
    }
    
    const searchTime = Date.now() - startSearch;
    console.log(`   ✅ Completed ${searchCount} searches in ${searchTime}ms`);
    console.log(`   Average: ${(searchTime / searchCount).toFixed(0)}ms per search`);
    
    // Cleanup
    console.log('3. Cleaning up test resources...');
    let deleted = 0;
    
    for (const id of resourceIds) {
      const result = await apiCall(`${API_BASE_URL}/${id}`, 'DELETE');
      if (result.status === 200) deleted++;
    }
    
    console.log(`   ✅ Deleted ${deleted}/${resourceIds.length} resources`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    
    // Cleanup on error
    for (const id of resourceIds) {
      await apiCall(`${API_BASE_URL}/${id}`, 'DELETE').catch(() => {});
    }
    
    return false;
  }
}

// Test 4: Error handling and edge cases
async function testErrorHandling() {
  console.log('\n⚠️ Test 4: Error Handling');
  console.log('================================');
  
  const tests = [
    {
      name: "Invalid API key",
      test: async () => {
        const result = await apiCall(API_BASE_URL, 'GET', null, { 'x-api-key': 'wrong' });
        return result.status === 401;
      }
    },
    {
      name: "Empty content",
      test: async () => {
        const result = await apiCall(API_BASE_URL, 'POST', { content: '' });
        return result.status === 400;
      }
    },
    {
      name: "Missing content field",
      test: async () => {
        const result = await apiCall(API_BASE_URL, 'POST', {});
        return result.status === 400;
      }
    },
    {
      name: "Non-existent resource ID",
      test: async () => {
        const result = await apiCall(`${API_BASE_URL}/j97xxxxxxxxxxxxxxxxxxxxxxxxx`, 'DELETE');
        return result.status === 500; // Should fail gracefully
      }
    },
    {
      name: "Search with empty query",
      test: async () => {
        const result = await apiCall(SEARCH_URL, 'POST', { query: '' });
        // Should handle gracefully, either return empty or error
        return result.status === 200 || result.status === 400;
      }
    }
  ];
  
  let passed = 0;
  
  for (const testCase of tests) {
    try {
      const success = await testCase.test();
      if (success) {
        console.log(`   ✅ ${testCase.name}`);
        passed++;
      } else {
        console.log(`   ❌ ${testCase.name}`);
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Passed: ${passed}/${tests.length}`);
  return passed === tests.length;
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Running Integration Test Suite');
  console.log('==================================\n');
  console.log('Prerequisites:');
  console.log('- Dev server running on port 3001');
  console.log('- Convex dev running');
  console.log('- OpenAI API key configured\n');
  
  // Check server is running
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
  
  // Run tests
  const results = {
    crud: false,
    search: false,
    performance: false,
    errors: false
  };
  
  results.crud = await testCompleteCRUD();
  results.search = await testSearchAccuracy();
  results.performance = await testPerformance();
  results.errors = await testErrorHandling();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`CRUD Operations:    ${results.crud ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search Accuracy:    ${results.search ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Performance:        ${results.performance ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Error Handling:     ${results.errors ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('🎉 All integration tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the details above.');
  }
}

// Run the tests
runIntegrationTests().catch(console.error);