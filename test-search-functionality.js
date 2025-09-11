/**
 * Test script to verify searchKnowledge actually works
 * This tests the actual search functionality, not just seeding
 */

const API_KEY = '123';

// Test the search by calling our server action directly
async function testSearchFunctionality() {
  console.log('🔍 Testing Search Functionality\n');
  console.log('================================\n');
  
  const searchTests = [
    {
      query: "How to search for customers in res.partner?",
      expectedKeywords: ["customer_rank", "res.partner"],
      description: "Should find res.partner documentation with customer search info"
    },
    {
      query: "What fields does product.product have?",
      expectedKeywords: ["barcode", "list_price", "product.product"],
      description: "Should find product.product field documentation"
    },
    {
      query: "How to create a sale order?",
      expectedKeywords: ["partner_id", "sale.order", "REQUIRED"],
      description: "Should find sale.order creation requirements"
    },
    {
      query: "product variants",
      expectedKeywords: ["product.product", "variants", "product.template"],
      description: "Should find info about product variants"
    },
    {
      query: "date range search in orders",
      expectedKeywords: ["date_order", ">=", "<="],
      description: "Should find date range search examples"
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of searchTests) {
    console.log(`\n📝 Test: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      // We'll test by calling the server action through a simple HTTP endpoint
      // In production, the MCP tool calls this same action
      const response = await fetch('http://localhost:3001/api/test-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: test.query,
          limit: 3,
          threshold: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.results && result.results.length > 0) {
        console.log(`✅ Found ${result.results.length} results`);
        
        // Check if the top result contains expected keywords
        const topResult = result.results[0];
        console.log(`   Top result confidence: ${topResult.confidence.toFixed(3)}`);
        
        const contentLower = topResult.content.toLowerCase();
        const foundKeywords = test.expectedKeywords.filter(keyword => 
          contentLower.includes(keyword.toLowerCase())
        );
        
        if (foundKeywords.length > 0) {
          console.log(`   ✅ Found expected keywords: ${foundKeywords.join(', ')}`);
          console.log(`   Preview: ${topResult.content.substring(0, 150)}...`);
          passedTests++;
        } else {
          console.log(`   ⚠️ Expected keywords not found in top result`);
          console.log(`   Expected: ${test.expectedKeywords.join(', ')}`);
          console.log(`   Preview: ${topResult.content.substring(0, 150)}...`);
          failedTests++;
        }
      } else {
        console.log('❌ No results returned');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failedTests++;
    }
  }

  console.log('\n================================');
  console.log('📊 SEARCH TEST RESULTS:');
  console.log(`✅ Passed: ${passedTests}/${searchTests.length}`);
  console.log(`❌ Failed: ${failedTests}/${searchTests.length}`);
  console.log('================================\n');

  return passedTests === searchTests.length;
}


// Alternative: Test using the server action directly via eval (if in Next.js context)
async function testViaServerAction() {
  console.log('🧪 Testing Search via Direct Server Action Call\n');
  
  // This would work if we're running in a Next.js context
  // For now, we'll simulate the expected behavior
  
  const mockSearchResults = {
    "How to search for customers": {
      found: true,
      confidence: 0.89,
      content: "customer_rank: Customer ranking (>0 means is a customer)"
    },
    "product fields": {
      found: true,
      confidence: 0.92,
      content: "barcode: Product barcode, list_price: Sale price"
    }
  };
  
  console.log('Simulated search results (actual results would come from vector search):');
  for (const [query, result] of Object.entries(mockSearchResults)) {
    console.log(`\nQuery: "${query}"`);
    if (result.found) {
      console.log(`✅ Match found (confidence: ${result.confidence})`);
      console.log(`   Content: ${result.content}`);
    }
  }
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('🚀 Testing searchKnowledge Functionality\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3001/api/knowledge/resources', {
      headers: { 'x-api-key': API_KEY }
    });
    
    if (healthCheck.ok) {
      console.log('✅ Server is running\n');
      
      // Run actual search tests
      const success = await testSearchFunctionality();
      
      if (success) {
        console.log('🎉 All search tests passed!');
      } else {
        console.log('⚠️ Some search tests failed. Check the results above.');
      }
      
      return success;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the dev server first.\n');
    return false;
  }
}

// Run the tests
runTests().catch(console.error);