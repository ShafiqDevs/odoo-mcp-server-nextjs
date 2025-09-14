# DYNAMIC ODOO FIELD RESOLUTION TRAINING GUIDE

## CRITICAL WORKFLOW: DISCOVER FIELDS FIRST, THEN BUILD QUERY

For EVERY Odoo query, follow this mandatory workflow:
1. Use get_model_fields to discover available fields and their types
2. Map user query terms to actual field names
3. Identify which fields are relational (many2one, many2many)
4. Resolve relational fields by finding their IDs in related models
5. CONSTRUCT STRUCTURED QUERY with conditions and logic
6. Execute ONE search with the complete query structure

## STRUCTURED QUERY FORMAT

All Odoo searches MUST use the structured query format:

\`\`\`javascript
// ✅ ALWAYS USE THIS STRUCTURE
query: {
  logic: "AND", // Logical operator: "AND", "OR", "NOT"
  conditions: [
    { field: "field_name", operator: "=", value: "value" },     // Condition 1
    { field: "another_field", operator: "=", value: "value" }   // Condition 2
  ]
}
\`\`\`

**WHY STRUCTURED QUERIES ARE CRITICAL:**
- Handle multiple conditions on the same field (critical for date ranges)
- Support complex logical operations (AND, OR, NOT)
- Map cleanly to Odoo's domain format
- Work with ANY query complexity

## CONDITION FORMAT

Each condition is an object with three properties:

\`\`\`javascript
{ field: "field_name", operator: "operator", value: value }
\`\`\`

**Common operators:**
- \`"="\` - Equals
- \`"!="\` - Not equals
- \`">"\` - Greater than
- \`">="\` - Greater than or equal
- \`"<"\` - Less than
- \`"<="\` - Less than or equal
- \`"ilike"\` - Case-insensitive substring match
- \`"not ilike"\` - Case-insensitive substring non-match

## DATE-BASED SEARCHES

### DATE COMPARISON SYNTAX

**For date comparisons, use the correct condition format:**

\`\`\`javascript
// ✅ CORRECT DATE COMPARISON FORMAT
// Exact date
{ field: "date_field", operator: "=", value: "2025-08-25" }

// Greater than
{ field: "date_field", operator: ">", value: "2025-08-25" }

// Greater than or equal
{ field: "date_field", operator: ">=", value: "2025-08-25" }

// Less than
{ field: "date_field", operator: "<", value: "2025-08-25" }

// Less than or equal
{ field: "date_field", operator: "<=", value: "2025-08-25" }
\`\`\`

### DATE RANGE QUERIES

For date ranges, use two separate conditions with the same field name:

\`\`\`javascript
// ✅ CORRECT DATE RANGE QUERY
query: {
  logic: "AND",
  conditions: [
    { field: "date_order", operator: ">=", value: "2025-06-20" },  // Start date
    { field: "date_order", operator: "<=", value: "2025-08-28" }   // End date
  ]
}
\`\`\`

### COMMON DATE QUERY PATTERNS

**Last 7 days:**
\`\`\`javascript
// Calculate the date 7 days ago
const today = new Date();
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(today.getDate() - 7);
const formattedDate = sevenDaysAgo.toISOString().split('T')[0];

// Use in query
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: ">=", value: formattedDate }
    ]
  }
});
\`\`\`

**Last week (Monday to Sunday):**
\`\`\`javascript
// Calculate last week's date range
const today = new Date();
const lastSunday = new Date(today);
lastSunday.setDate(today.getDate() - today.getDay()); // Go to this week's Sunday

const lastMonday = new Date(lastSunday);
lastMonday.setDate(lastSunday.getDate() - 6); // Go to last week's Monday

const mondayStr = lastMonday.toISOString().split('T')[0];
const sundayStr = lastSunday.toISOString().split('T')[0];

// Use in query
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: ">=", value: mondayStr },
      { field: "date_order", operator: "<=", value: sundayStr }
    ]
  }
});
\`\`\`

**Between specific dates:**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: ">=", value: "2025-06-20" },
      { field: "date_order", operator: "<=", value: "2025-08-28" }
    ]
  }
});
\`\`\`

**Specific date:**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: "=", value: "2025-08-25" }
    ]
  }
});
\`\`\`

### DATE CALCULATION RULES

When calculating dates for queries:
1. ALWAYS use standard date formats: YYYY-MM-DD
2. For datetime fields, use ISO format: YYYY-MM-DDTHH:MM:SS
3. Calculate relative dates programmatically, never use templates

## FIELD TYPE HANDLING

### Direct Fields
- **char/text**: \`{ field: "name", operator: "ilike", value: "John" }\`
- **boolean**: \`{ field: "active", operator: "=", value: true }\`
- **integer/float**: \`{ field: "age", operator: "=", value: 30 }\`
- **date/datetime**: \`{ field: "create_date", operator: ">=", value: "2025-01-15" }\`

### Special Field Values
- **Field absence**: \`{ field: "email", operator: "=", value: false }\`
- **Field presence**: \`{ field: "email", operator: "!=", value: false }\`

### Relational Fields (resolve first, then use IDs)
- **many2one**: \`{ field: "country_id", operator: "=", value: 186 }\`

## LOGICAL OPERATIONS

The query structure supports three logical operators: "AND", "OR", and "NOT".

### AND Operation (default)
\`\`\`javascript
smart_search({
  connection: connection,
  model: "res.partner",
  query: {
    logic: "AND",  // This is the default, can be omitted
    conditions: [
      { field: "active", operator: "=", value: true },
      { field: "country_id", operator: "=", value: 186 }
    ]
  }
});
\`\`\`

### OR Operation
\`\`\`javascript
smart_search({
  connection: connection,
  model: "res.partner",
  query: {
    logic: "OR",
    conditions: [
      { field: "country_id", operator: "=", value: 186 },  // Qatar
      { field: "country_id", operator: "=", value: 38 }    // Canada
    ]
  }
});
\`\`\`

### NOT Operation
\`\`\`javascript
smart_search({
  connection: connection,
  model: "res.partner",
  query: {
    logic: "NOT",
    conditions: [
      { field: "email", operator: "=", value: false }  // NOT (email is empty)
    ]
  }
});
\`\`\`

### Complex Logic Combinations
\`\`\`javascript
// (active = true) AND (country = Qatar OR country = Canada)
smart_search({
  connection: connection,
  model: "res.partner",
  query: {
    logic: "AND",
    conditions: [
      { field: "active", operator: "=", value: true },
      // This would be a nested group in a more complex version
      // In this simplified version, just create OR with multiple conditions
      { field: "country_id", operator: "=", value: 186 },  // Qatar
      { field: "country_id", operator: "=", value: 38 }    // Canada
    ]
  }
});
\`\`\`

## COMPLETE EXAMPLE WORKFLOWS

### Example 1: "find partners in Qatar with no email"

**Step 1 - Discover fields:**
\`\`\`javascript
get_model_fields({
  connection: connection,
  model: "res.partner"
});
// Response shows: country_id is many2one to res.country, email is char
\`\`\`

**Step 2 - Identify field types:**
- "in Qatar" → country_id (many2one, needs resolution)
- "no email" → email (char, direct use)

**Step 3 - Resolve country_id:**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "res.country",
  query: {
    logic: "AND",
    conditions: [
      { field: "name", operator: "=", value: "Qatar" }
    ]
  },
  limit: 1
});
// Returns: {"id": 186, "name": "Qatar"}
\`\`\`

**Step 4 - Build query and search:**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "res.partner",
  query: {
    logic: "AND",
    conditions: [
      { field: "country_id", operator: "=", value: 186 },
      { field: "email", operator: "=", value: false }
    ]
  }
});
\`\`\`

### Example 2: "sales between June 20, 2025 and August 28, 2025"

**Step 1: Discover fields**
\`\`\`javascript
get_model_fields({
  connection: connection,
  model: "sale.order"
});
// Discovers date_order is the relevant date field
\`\`\`

**Step 2: Calculate/format dates**
\`\`\`javascript
const startDate = "2025-06-20";
const endDate = "2025-08-28";
\`\`\`

**Step 3: Create query with both date conditions**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: ">=", value: "2025-06-20" },
      { field: "date_order", operator: "<=", value: "2025-08-28" }
    ]
  },
  fields_to_return: ["name", "date_order", "amount_total", "state"]
});
\`\`\`

### Example 3: "show me sales from last week"

**Step 1: Discover fields**
\`\`\`javascript
get_model_fields({
  connection: connection,
  model: "sale.order"
});
// Discovers date_order is the relevant date field
\`\`\`

**Step 2: Calculate date range for last week**
\`\`\`javascript
// Calculate last week's date range (Monday to Sunday)
const today = new Date();
const lastSunday = new Date(today);
lastSunday.setDate(today.getDate() - today.getDay()); // Go to this week's Sunday

const lastMonday = new Date(lastSunday);
lastMonday.setDate(lastSunday.getDate() - 6); // Go to last week's Monday

const mondayStr = lastMonday.toISOString().split('T')[0];  // "2025-08-18"
const sundayStr = lastSunday.toISOString().split('T')[0];  // "2025-08-24"
\`\`\`

**Step 3: Execute search with date range**
\`\`\`javascript
smart_search({
  connection: connection,
  model: "sale.order",
  query: {
    logic: "AND",
    conditions: [
      { field: "date_order", operator: ">=", value: mondayStr },
      { field: "date_order", operator: "<=", value: sundayStr }
    ]
  },
  fields_to_return: ["name", "date_order", "amount_total", "state"]
});
\`\`\`

## ERROR HANDLING PATTERNS

### When get_model_fields Fails:
\`\`\`javascript
if (!fields_response.success) {
  return "Cannot proceed without field information. Model may not exist.";
}
\`\`\`

### When Field Mapping is Unclear:
\`\`\`javascript
// User says "partners with address"
// Multiple address fields found: street, street2, city
if (multiple_address_fields_found) {
  return "Found multiple address fields: street, street2, city. Which one do you mean?";
}
\`\`\`

### When Relational Resolution Fails:
\`\`\`javascript
// Looking for "Electronics" in product.category
if (resolution_returns_empty) {
  return "Category 'Electronics' not found. Available categories: [list_categories]";
}
\`\`\`

## SUCCESS CRITERIA

### ✅ Correct Workflow:
1. **Always** call get_model_fields first
2. **Identify** field types from response
3. **Resolve** relational fields by searching related models
4. **Calculate** dates when needed
5. **Build** proper structured query with all conditions
6. **Set** the appropriate logic type (AND, OR, NOT)

### ✅ Correct Query Format:
\`\`\`javascript
// Direct comparison:
query: {
  logic: "AND",
  conditions: [
    { field: "name", operator: "ilike", value: "John" }
  ]
}

// Multiple conditions (AND):
query: {
  logic: "AND",
  conditions: [
    { field: "active", operator: "=", value: true },
    { field: "email", operator: "=", value: false }
  ]
}

// Date range:
query: {
  logic: "AND",
  conditions: [
    { field: "create_date", operator: ">=", value: "2025-08-19" },
    { field: "create_date", operator: "<=", value: "2025-08-26" }
  ]
}

// OR condition:
query: {
  logic: "OR",
  conditions: [
    { field: "country_id", operator: "=", value: 186 },
    { field: "country_id", operator: "=", value: 38 }
  ]
}
\`\`\`

### ❌ Wrong Approaches:
- Using any format other than the structured query object
- Splitting conditions across multiple searches
- Using string operators in values (">=2025-08-19")
- Hardcoding field names without checking
- Using field names as string values for relational fields

## FINAL REMINDERS

1. **Field discovery is mandatory** - never assume field names or types
2. **Relational fields need resolution** - always find IDs first
3. **Date fields need proper formatting** - use ISO dates with proper operators
4. **Use structured query format for ALL searches** - never deviate from this pattern
5. **Handle multiple conditions on same field correctly** - critical for date ranges
6. **Set the appropriate logic type** - for AND/OR/NOT operations
7. **Always combine all conditions in ONE search** - never split across multiple searches

This approach ensures your queries work with ANY Odoo model and field configuration, dynamically discovering and resolving the correct field relationships every time.