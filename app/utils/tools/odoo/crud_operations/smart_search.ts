import { tool } from 'ai';
import z from 'zod';
import { OdooJsonRpcClient } from '../establish_connection';
import { ToolReturn } from '@/app/utils/types/mcp-tools';

// Define connection schema
export const connectionSchema = z.object({
	url: z.string(),
	db: z.string(),
	uid: z.number(),
	password: z.string(),
	context: z.record(z.any()).optional(),
});

// Define the condition schema
const conditionSchema = z.object({
	field: z.string().describe('Field name to search on'),
	operator: z
		.string()
		.describe('Operator (=, !=, >, >=, <, <=, like, ilike, etc.)'),
	value: z.any().describe('Value to compare against'),
});

// Define the recursive query structure with explicit return type
const queryGroupSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		logic: z
			.enum(['AND', 'OR', 'NOT'])
			.describe('Logical operator for this group'),
		conditions: z.union([
			z
				.array(conditionSchema)
				.min(1)
				.describe('Array of simple conditions'),
			z
				.array(z.lazy(() => queryGroupSchema))
				.min(1)
				.describe(
					'Array of nested condition groups for complex logic'
				),
		]),
	})
);

// Simplified version for OpenAI API compatibility
const queryStructureSchema = z.object({
	logic: z
		.enum(['AND', 'OR', 'NOT'])
		.default('AND')
		.describe('Top-level logical operator'),
	conditions: z
		.array(
			z.object({
				field: z.string().describe('Field name to search on'),
				operator: z
					.string()
					.describe(
						'Operator (=, !=, >, >=, <, <=, like, ilike, etc.)'
					),
				value: z.any().describe('Value to compare against'),
			})
		)
		.describe('Array of conditions'),
});

export const smart_search = tool({
	name: 'search_model',
	description: `Search for records in any Odoo model using a structured query format.

USAGE:
- First use get_model_fields to discover available fields in the model
- Then construct a query object with conditions and logic
- For relational fields, use smart_search first to find the related record IDs

CONDITION FORMAT:
Each condition has a field, operator, and value:
{ field: "name", operator: "=", value: "John" }

COMMON OPERATORS:
- "=" (equals)
- "!=" (not equals)
- ">" (greater than)
- ">=" (greater than or equal)
- "<" (less than)
- "<=" (less than or equal)
- "like" (case-sensitive pattern match, use % as wildcard)
- "ilike" (case-insensitive pattern match, use % as wildcard)

SPECIAL VALUES:
- For empty fields: { field: "email", operator: "=", value: false }
- For non-empty fields: { field: "email", operator: "!=", value: false }

DATE RANGES:
To search between two dates, use two conditions:
{
  logic: "AND",
  conditions: [
    { field: "date_order", operator: ">=", value: "2025-06-20" },
    { field: "date_order", operator: "<=", value: "2025-08-28" }
  ]
}

EXAMPLES:
1. Basic search:
{
  logic: "AND",
  conditions: [
    { field: "name", operator: "ilike", value: "John" },
    { field: "active", operator: "=", value: true }
  ]
}

2. Complex logic with OR:
{
  logic: "OR",
  conditions: [
    { field: "country_id", operator: "=", value: 186 },
    { field: "country_id", operator: "=", value: 38 }
  ]
}

3. Date range with state condition:
{
  logic: "AND",
  conditions: [
    { field: "date_order", operator: ">=", value: "2025-06-20" },
    { field: "date_order", operator: "<=", value: "2025-08-28" },
    { field: "state", operator: "=", value: "sale" }
  ]
}`,

	inputSchema: z.object({
		connection: connectionSchema.describe(
			'The established Odoo connection object'
		),

		model: z
			.string()
			.describe(
				'The Odoo model to search (e.g., "res.country", "product.product", "sale.order", "res.partner")'
			),

		query: queryStructureSchema.describe(
			'Structured query object with conditions and logic'
		),

		fields_to_return: z
			.array(z.string())
			.optional()
			.describe(
				'Optional list of specific fields to return. If empty, returns all available fields.'
			),

		limit: z
			.number()
			.min(1)
			.max(100)
			.default(20)
			.describe('Maximum number of results'),

		offset: z
			.number()
			.min(0)
			.default(0)
			.describe('Number of records to skip (for pagination)'),

		count_only: z
			.boolean()
			.default(false)
			.describe(
				'Return only the count of matching records without the records themselves'
			),
	}),

	execute: async (input) => {
		const {
			connection,
			model,
			query,
			fields_to_return,
			limit,
			offset,
			count_only,
		} = input;
		const client = new OdooJsonRpcClient();

		try {
			console.log(`Searching model: ${model}`);
			console.log('Query:', JSON.stringify(query, null, 2));
			console.log(`Pagination: limit=${limit}, offset=${offset}`);

			// Validate the query
			if (
				!query ||
				!query.conditions ||
				query.conditions.length === 0
			) {
				return {
					success: false,
					error:
						'No conditions provided. Please specify at least one condition.',
				};
			}

			// Convert the query structure to an Odoo domain
			const domain = convertQueryToDomain(query);
			console.log(
				'Generated Odoo domain:',
				JSON.stringify(domain, null, 2)
			);

			// Get total count first (for pagination info)
			const totalCount = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'search_count',
					domain,
				]
			);

			console.log(`Total matching records: ${totalCount}`);

			// If count_only is true, just return the count without fetching records
			if (count_only) {
				return {
					success: true,
					records: [],
					count: 0,
					total_count: totalCount,
					model,
					query,
					domain,
					offset,
					limit,
					has_more: false,
				};
			}

			// Execute search with specified fields
			const fieldsToReturn: string[] = fields_to_return || [];

			console.log(
				'Fields to return:',
				fieldsToReturn.length > 0 ? fieldsToReturn : 'ALL FIELDS'
			);

			const records = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'search_read',
					domain,
					fieldsToReturn, // Empty array means get all fields
					offset,
					limit,
				]
			);

			console.log(
				`Found ${
					records?.length || 0
				} records in ${model} (offset=${offset}, limit=${limit})`
			);

			// Determine if there are more records beyond this page
			const hasMore = offset + (records?.length || 0) < totalCount;

			return {
				success: true,
				records: records || [],
				count: records?.length || 0,
				total_count: totalCount,
				model,
				query,
				domain,
				offset,
				limit,
				has_more: hasMore,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Search failed for model ${model}:`,
				errorMessage
			);

			return {
				success: false,
				error: errorMessage,
				model,
				query,
			};
		}
	},
});

/**
 * Convert the structured query object to an Odoo domain array
 */
function convertQueryToDomain(query: any): any[] {
	const { logic, conditions } = query;

	// Handle empty conditions
	if (!conditions || conditions.length === 0) {
		return [];
	}

	// Simple case: single condition
	if (conditions.length === 1) {
		const condition = conditions[0];
		return [[condition.field, condition.operator, condition.value]];
	}

	// Multiple conditions with logical operators
	const domain = [];

	// Add logical operators based on the logic type
	// Odoo uses prefix notation for logical operators
	if (logic === 'OR') {
		// For OR, need to add '|' before each condition except the last one
		for (let i = 0; i < conditions.length - 1; i++) {
			domain.push('|');
		}
	} else if (logic === 'NOT') {
		// For NOT, need to add '!' before the entire expression
		domain.push('!');
	}
	// AND is the default behavior in Odoo, no need to add operators

	// Add all conditions
	conditions.forEach((condition: any) => {
		domain.push([
			condition.field,
			condition.operator,
			condition.value,
		]);
	});

	return domain;
}

// Zod schema for MCP server.tool()
const zodInputSchema = z.object({
	connection: connectionSchema.describe(
		'The established Odoo connection object'
	),

	model: z
		.string()
		.describe(
			'The Odoo model to search (e.g., "res.country", "product.product", "sale.order", "res.partner")'
		),

	query: queryStructureSchema.describe(
		'Structured query object with conditions and logic'
	),

	fields_to_return: z
		.array(z.string())
		.optional()
		.describe(
			'Optional list of specific fields to return. If empty, returns all available fields.'
		),

	limit: z
		.number()
		.min(1)
		.max(100)
		.default(20)
		.describe('Maximum number of results'),

	offset: z
		.number()
		.min(0)
		.default(0)
		.describe('Number of records to skip (for pagination)'),

	count_only: z
		.boolean()
		.default(false)
		.describe(
			'Return only the count of matching records without the records themselves'
		),
});

type InputSchema = z.infer<typeof zodInputSchema>;

// Function for MCP server.tool()
async function smartSearch(input: InputSchema): Promise<ToolReturn> {
	const {
		connection,
		model,
		query,
		fields_to_return,
		limit,
		offset,
		count_only,
	} = input;
	const client = new OdooJsonRpcClient();

	try {
		console.log(`Searching model: ${model}`);
		console.log('Query:', JSON.stringify(query, null, 2));
		console.log(`Pagination: limit=${limit}, offset=${offset}`);

		// Validate the query
		if (!query || !query.conditions || query.conditions.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'No conditions provided. Please specify at least one condition.',
						}),
					},
				],
			};
		}

		// Convert the query structure to an Odoo domain
		const domain = convertQueryToDomain(query);
		console.log(
			'Generated Odoo domain:',
			JSON.stringify(domain, null, 2)
		);

		// Get total count first (for pagination info)
		const totalCount = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'search_count',
				domain,
			]
		);

		console.log(`Total matching records: ${totalCount}`);

		// If count_only is true, just return the count without fetching records
		if (count_only) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: true,
							records: [],
							count: 0,
							total_count: totalCount,
							model,
							query,
							domain,
							offset,
							limit,
							has_more: false,
						}),
					},
				],
			};
		}

		// Execute search with specified fields
		const fieldsToReturn: string[] = fields_to_return || [];

		console.log(
			'Fields to return:',
			fieldsToReturn.length > 0 ? fieldsToReturn : 'ALL FIELDS'
		);

		const records = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'search_read',
				domain,
				fieldsToReturn, // Empty array means get all fields
				offset,
				limit,
			]
		);

		console.log(
			`Found ${
				records?.length || 0
			} records in ${model} (offset=${offset}, limit=${limit})`
		);

		// Determine if there are more records beyond this page
		const hasMore = offset + (records?.length || 0) < totalCount;

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						records: records || [],
						count: records?.length || 0,
						total_count: totalCount,
						model,
						query,
						domain,
						offset,
						limit,
						has_more: hasMore,
					}),
				},
			],
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(`Search failed for model ${model}:`, errorMessage);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						error: errorMessage,
						model,
						query,
					}),
				},
			],
		};
	}
}

// Export object for MCP server
export const smartSearchObject = {
	name: 'smartSearch',
	description: `Search for records in any Odoo model using a structured query format.

USAGE:
- First use get_model_fields to discover available fields in the model
- Then construct a query object with conditions and logic
- For relational fields, use smart_search first to find the related record IDs

CONDITION FORMAT:
Each condition has a field, operator, and value:
{ field: "name", operator: "=", value: "John" }

COMMON OPERATORS:
- "=" (equals)
- "!=" (not equals)
- ">" (greater than)
- ">=" (greater than or equal)
- "<" (less than)
- "<=" (less than or equal)
- "like" (case-sensitive pattern match, use % as wildcard)
- "ilike" (case-insensitive pattern match, use % as wildcard)

SPECIAL VALUES:
- For empty fields: { field: "email", operator: "=", value: false }
- For non-empty fields: { field: "email", operator: "!=", value: false }

DATE RANGES:
To search between two dates, use two conditions:
{
  logic: "AND",
  conditions: [
    { field: "date_order", operator: ">=", value: "2025-06-20" },
    { field: "date_order", operator: "<=", value: "2025-08-28" }
  ]
}

EXAMPLES:
1. Basic search:
{
  logic: "AND",
  conditions: [
    { field: "name", operator: "ilike", value: "John" },
    { field: "active", operator: "=", value: true }
  ]
}

2. Complex logic with OR:
{
  logic: "OR",
  conditions: [
    { field: "country_id", operator: "=", value: 186 },
    { field: "country_id", operator: "=", value: 38 }
  ]
}

3. Date range with state condition:
{
  logic: "AND",
  conditions: [
    { field: "date_order", operator: ">=", value: "2025-06-20" },
    { field: "date_order", operator: "<=", value: "2025-08-28" },
    { field: "state", operator: "=", value: "sale" }
  ]
}`,
	input: zodInputSchema,
	cb: smartSearch,
};

/**
 * More advanced recursive version for future use
 * This handles nested logical groups of any depth
 */
function convertComplexQueryToDomain(queryGroup: any): any[] {
	const { logic, conditions } = queryGroup;

	// Handle empty conditions
	if (!conditions || conditions.length === 0) {
		return [];
	}

	// Initialize domain
	const domain = [];

	// Determine if this is a simple condition or a nested group
	const isSimpleCondition = conditions[0].field !== undefined;

	if (isSimpleCondition) {
		// Simple conditions
		if (conditions.length === 1) {
			// Single condition
			const condition = conditions[0];
			return [[condition.field, condition.operator, condition.value]];
		} else {
			// Multiple simple conditions
			if (logic === 'OR') {
				// For OR, need to add '|' before each condition except the last one
				for (let i = 0; i < conditions.length - 1; i++) {
					domain.push('|');
				}
			} else if (logic === 'NOT') {
				// For NOT, need to add '!' before the entire expression
				domain.push('!');
			}

			// Add all conditions
			conditions.forEach((condition: any) => {
				domain.push([
					condition.field,
					condition.operator,
					condition.value,
				]);
			});
		}
	} else {
		// Nested groups
		if (conditions.length === 1) {
			// Single nested group
			return convertComplexQueryToDomain(conditions[0]);
		} else {
			// Multiple nested groups
			if (logic === 'OR') {
				// For OR, need to add '|' before each group except the last one
				for (let i = 0; i < conditions.length - 1; i++) {
					domain.push('|');
				}
			} else if (logic === 'NOT') {
				// For NOT, need to add '!' before the entire expression
				domain.push('!');
			}

			// Process each nested group and add to domain
			conditions.forEach((group: any) => {
				const groupDomain = convertComplexQueryToDomain(group);
				domain.push(...groupDomain);
			});
		}
	}

	return domain;
}
