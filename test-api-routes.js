/**
 * Test script for Knowledge Base API routes
 * Run with: node test-api-routes.js
 */

const API_BASE_URL = 'http://localhost:3001/api/knowledge/resources';
const API_KEY = '123'; // From .env.local

let createdResourceId = null;

// Helper function to make API calls
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
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Test functions
async function test1_CreateResource() {
  console.log('\n📝 TEST 1: Creating a new resource...');
  
  const testContent = `# Odoo Partner Model Guide

The res.partner model is the main model for managing contacts in Odoo.

## Common Fields
- name: The partner's name (required)
- email: Email address
- phone: Phone number
- is_company: Boolean indicating if it's a company
- parent_id: Reference to parent company (many2one)

## Search Examples
To find partners by name, use the smart_search tool with:
{ field: "name", operator: "ilike", value: "%john%" }`;

  const result = await apiCall(API_BASE_URL, 'POST', { content: testContent });
  
  console.log('Response Status:', result.status);
  console.log('Response Data:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 201 && result.data.id) {
    createdResourceId = result.data.id;
    console.log('✅ SUCCESS: Resource created with ID:', createdResourceId);
    return true;
  } else {
    console.log('❌ FAILED: Could not create resource');
    return false;
  }
}

async function test2_ListResources() {
  console.log('\n📋 TEST 2: Listing all resources...');
  
  const result = await apiCall(API_BASE_URL, 'GET');
  
  console.log('Response Status:', result.status);
  console.log('Response Data:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200 && result.data.resources) {
    console.log(`✅ SUCCESS: Found ${result.data.count} resource(s)`);
    
    // Check if our created resource is in the list
    const found = result.data.resources.find(r => r._id === createdResourceId);
    if (found) {
      console.log('✅ Verified: Created resource is in the list');
    } else {
      console.log('⚠️ Warning: Created resource not found in list');
    }
    return true;
  } else {
    console.log('❌ FAILED: Could not list resources');
    return false;
  }
}

async function test3_UpdateResource() {
  console.log('\n✏️ TEST 3: Updating the resource...');
  
  if (!createdResourceId) {
    console.log('⚠️ SKIPPED: No resource ID to update');
    return false;
  }
  
  const updatedContent = `# Odoo Partner Model Guide (UPDATED)

The res.partner model is the main model for managing contacts in Odoo.

## Common Fields (Updated List)
- name: The partner's name (required)
- email: Email address
- phone: Phone number
- mobile: Mobile phone number
- is_company: Boolean indicating if it's a company
- parent_id: Reference to parent company (many2one)
- child_ids: References to child contacts (one2many)

## Search Examples (Enhanced)
To find partners by name, use the smart_search tool with:
{ field: "name", operator: "ilike", value: "%john%" }

To find companies only:
{ field: "is_company", operator: "=", value: true }`;

  const result = await apiCall(`${API_BASE_URL}/${createdResourceId}`, 'PUT', { content: updatedContent });
  
  console.log('Response Status:', result.status);
  console.log('Response Data:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ SUCCESS: Resource updated');
    return true;
  } else {
    console.log('❌ FAILED: Could not update resource');
    return false;
  }
}

async function test4_DeleteResource() {
  console.log('\n🗑️ TEST 4: Deleting the resource...');
  
  if (!createdResourceId) {
    console.log('⚠️ SKIPPED: No resource ID to delete');
    return false;
  }
  
  const result = await apiCall(`${API_BASE_URL}/${createdResourceId}`, 'DELETE');
  
  console.log('Response Status:', result.status);
  console.log('Response Data:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ SUCCESS: Resource deleted');
    return true;
  } else {
    console.log('❌ FAILED: Could not delete resource');
    return false;
  }
}

async function test5_VerifyDeletion() {
  console.log('\n🔍 TEST 5: Verifying deletion...');
  
  const result = await apiCall(API_BASE_URL, 'GET');
  
  console.log('Response Status:', result.status);
  
  if (result.status === 200 && result.data.resources) {
    const found = result.data.resources.find(r => r._id === createdResourceId);
    if (!found) {
      console.log('✅ SUCCESS: Resource successfully deleted (not in list)');
      console.log(`Total resources remaining: ${result.data.count}`);
      return true;
    } else {
      console.log('❌ FAILED: Resource still exists after deletion');
      return false;
    }
  } else {
    console.log('❌ FAILED: Could not verify deletion');
    return false;
  }
}

async function test6_InvalidApiKey() {
  console.log('\n🔒 TEST 6: Testing invalid API key...');
  
  const options = {
    method: 'GET',
    headers: {
      'x-api-key': 'wrong-key',
      'Content-Type': 'application/json',
    },
  };
  
  try {
    const response = await fetch(API_BASE_URL, options);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('✅ SUCCESS: Correctly rejected invalid API key');
      return true;
    } else {
      console.log('❌ FAILED: Should have returned 401 for invalid key');
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED: Error testing invalid key:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting API Route Tests...');
  console.log('================================');
  console.log('Make sure the Next.js dev server is running on http://localhost:3000');
  console.log('Make sure Convex dev is also running');
  
  const results = [];
  
  // Wait a moment for any server startup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await test1_CreateResource());
  results.push(await test2_ListResources());
  results.push(await test3_UpdateResource());
  results.push(await test4_DeleteResource());
  results.push(await test5_VerifyDeletion());
  results.push(await test6_InvalidApiKey());
  
  console.log('\n================================');
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log(`✅ Passed: ${results.filter(r => r).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}`);
  console.log('================================\n');
  
  if (results.every(r => r)) {
    console.log('🎉 All tests passed successfully!');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above.');
  }
}

// Run the tests
runAllTests().catch(console.error);