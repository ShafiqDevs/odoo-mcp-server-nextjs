import { tool } from 'ai';
import { z } from 'zod';
import { OdooJsonRpcClient } from '../establish_connection';
import { ToolReturn } from '@/app/utils/types/mcp-tools';

// Define Zod schema for the connection object
export const connectionSchema = z.object({
	url: z.string().url(),
	db: z.string(),
	uid: z.number().int().positive(),
	password: z.string(),
	sessionId: z.string().optional(),
	context: z.record(z.any()).default({}),
});

// Define Zod schema for field information
const fieldInfoSchema = z.object({
	string: z.string().optional(),
	type: z.string(),
	help: z.string().optional(),
	required: z.boolean().optional(),
	readonly: z.boolean().optional(),
	relation: z.string().optional(),
	selection: z
		.array(
			z.tuple([
				z.union([z.string(), z.boolean(), z.number()]),
				z.string(),
			])
		)
		.optional(),
	domain: z.any().optional(),
	store: z.boolean().optional(),
	searchable: z.boolean().optional(),
	depends: z.array(z.string()).optional(),
	related: z.string().optional(),
	relation_field: z.string().optional(),
	index: z.boolean().optional(),
	copy: z.boolean().optional(),
});

// Define the output type for enhanced field information
export type FieldInfo = z.infer<typeof fieldInfoSchema>;

export const get_model_fields = tool({
	name: 'get_model_fields',
	description: `Get metadata about all fields for a specified Odoo model, including field types, relations, and other properties. 

USE THIS TOOL WHEN:
• You need to understand what fields are available in a model before searching
• User asks about model structure: "What fields does res.partner have?"
• You're unsure about field names: "Does product have a 'category' or 'categ_id' field?"
• Planning complex searches involving relational fields
• User wants to know searchable/filterable fields

WHEN NOT TO USE:
• You already know the field names you need for a search
• For common models (res.partner, product.product) where standard fields are well-known
• Just to search - use smart_search directly if you know the field names

HELPFUL FOR SMART_SEARCH PLANNING:
This tool identifies relational fields that need special handling in smart_search. Look for:
• Fields with type "many2one" or "many2many" 
• The "relation" property shows which model to search in
• Use these insights to build proper fields_to_resolve arrays

EXAMPLE WORKFLOW:
1. User: "Find products in electronics category"
2. You: get_model_fields(model: "product.product") → discover "categ_id" field relates to "product.category"
3. You: smart_search with fields_to_resolve: [{relation_field: "categ_id", relation_model: "product.category", search_field: "name", search_value: "Electronics"}]`,

	inputSchema: z.object({
		connection: connectionSchema.describe(
			'The established Odoo connection object'
		),

		model: z
			.string()
			.describe(
				'The Odoo model name to inspect (e.g., "res.partner", "product.product", "sale.order", "account.move")'
			),

		include_inherited: z
			.boolean()
			.default(true)
			.describe(
				'Whether to include fields inherited from parent models. Keep true for complete field overview.'
			),

		field_names: z
			.array(z.string())
			.optional()
			.describe(
				'Optional list of specific field names to retrieve. Leave empty to get all fields. Use when you want details about specific fields only.'
			),

		attributes: z
			.array(z.string())
			.default([
				'string',
				'type',
				'relation',
				'selection',
				'help',
				'required',
				'readonly',
			])
			.describe(`Field attributes to retrieve. Default set covers most needs:
• string: Human-readable field label
• type: Field type (char, integer, many2one, etc.)
• relation: Related model for relational fields
• selection: Options for selection fields
• help: Field description/tooltip
• required: Whether field is mandatory
• readonly: Whether field can be modified`),
	}),

	execute: async (input) => {
		const {
			connection,
			model,
			include_inherited,
			field_names,
			attributes,
		} = input;
		const client = new OdooJsonRpcClient();

		try {
			console.log(`Getting fields for model: ${model}`);

			// Get field information from Odoo
			const modelFields = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'fields_get',
					field_names || [],
					attributes,
				]
			);

			// Enhance field information with additional metadata
			const enhancedFields: Record<string, any> = {};

			// Collect relational fields information
			const relationalFields: Array<{
				field_name: string;
				field_type: string;
				relation_model: string;
				search_field: string;
				description: string;
			}> = [];

			for (const [fieldName, _fieldInfo] of Object.entries(
				modelFields
			)) {
				const fieldInfo = _fieldInfo as Record<string, any>;
				// Add computed properties or additional information
				enhancedFields[fieldName] = {
					...fieldInfo,
					// Add any additional computed properties here
				};

				// Identify relational fields that need special handling
				if (
					fieldInfo.type === 'many2one' ||
					fieldInfo.type === 'many2many'
				) {
					// Get main search field for the related model (usually 'name')
					const searchField = 'name'; // Default to 'name' as the most common search field

					relationalFields.push({
						field_name: fieldName,
						field_type: fieldInfo.type,
						relation_model: fieldInfo.relation,
						search_field: searchField,
						description: `Field ${fieldName} is a ${fieldInfo.type} relation to ${fieldInfo.relation}. Use fields_to_resolve for searching.`,
					});
				}
			}

			console.log(
				`Retrieved ${
					Object.keys(enhancedFields).length
				} fields for model ${model}`
			);
			console.log(
				`Identified ${relationalFields.length} relational fields that need resolution for searching`
			);

			return {
				success: true,
				model,
				fields: enhancedFields,
				field_count: Object.keys(enhancedFields).length,
				relational_fields: relationalFields,
				fields_to_resolve_example:
					relationalFields.length > 0
						? {
								description:
									'Example of how to resolve relational fields in searches',
								example: `
// Example of how to search using relational fields
smart_search({
  model: "${model}",
  search_criteria: { /* your direct criteria here */ },
  fields_to_resolve: [
    {
      relation_field: "${
				relationalFields[0]?.field_name || 'field_name'
			}",
      relation_model: "${
				relationalFields[0]?.relation_model || 'related_model'
			}",
      search_field: "${relationalFields[0]?.search_field || 'name'}",
      search_value: "value to search for"
    }
  ]
})
          `,
						  }
						: null,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Failed to get fields for model ${model}:`,
				errorMessage
			);

			return {
				success: false,
				model,
				error: errorMessage,
			};
		}
	},
});

const zodInputSchema = z.object({
	connection: connectionSchema.describe(
		'The established Odoo connection object'
	),

	model: z
		.string()
		.describe(
			'The Odoo model name to inspect (e.g., "res.partner", "product.product", "sale.order", "account.move")'
		),

	include_inherited: z
		.boolean()
		.default(true)
		.describe(
			'Whether to include fields inherited from parent models. Keep true for complete field overview.'
		),

	field_names: z
		.array(z.string())
		.optional()
		.describe(
			'Optional list of specific field names to retrieve. Leave empty to get all fields. Use when you want details about specific fields only.'
		),

	attributes: z
		.array(z.string())
		.default([
			'string',
			'type',
			'relation',
			'selection',
			'help',
			'required',
			'readonly',
		])
		.describe(`Field attributes to retrieve. Default set covers most needs:
• string: Human-readable field label
• type: Field type (char, integer, many2one, etc.)
• relation: Related model for relational fields
• selection: Options for selection fields
• help: Field description/tooltip
• required: Whether field is mandatory
• readonly: Whether field can be modified`),
});
type inputSchema = z.infer<typeof zodInputSchema>;

async function getModelFields(
	input: inputSchema
): Promise<ToolReturn> {
	const {
		connection,
		model,
		include_inherited,
		field_names,
		attributes,
	} = input;
	const client = new OdooJsonRpcClient();

	try {
		console.log(`Getting fields for model: ${model}`);

		// Get field information from Odoo
		const modelFields = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'fields_get',
				field_names || [],
				attributes,
			]
		);

		// Enhance field information with additional metadata
		const enhancedFields: Record<string, any> = {};

		// Collect relational fields information
		const relationalFields: Array<{
			field_name: string;
			field_type: string;
			relation_model: string;
			search_field: string;
			description: string;
		}> = [];

		for (const [fieldName, _fieldInfo] of Object.entries(
			modelFields
		)) {
			const fieldInfo = _fieldInfo as Record<string, any>;
			// Add computed properties or additional information
			enhancedFields[fieldName] = {
				...fieldInfo,
				// Add any additional computed properties here
			};

			// Identify relational fields that need special handling
			if (
				fieldInfo.type === 'many2one' ||
				fieldInfo.type === 'many2many'
			) {
				// Get main search field for the related model (usually 'name')
				const searchField = 'name'; // Default to 'name' as the most common search field

				relationalFields.push({
					field_name: fieldName,
					field_type: fieldInfo.type,
					relation_model: fieldInfo.relation,
					search_field: searchField,
					description: `Field ${fieldName} is a ${fieldInfo.type} relation to ${fieldInfo.relation}. Use fields_to_resolve for searching.`,
				});
			}
		}

		console.log(
			`Retrieved ${
				Object.keys(enhancedFields).length
			} fields for model ${model}`
		);
		console.log(
			`Identified ${relationalFields.length} relational fields that need resolution for searching`
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						model,
						fields: enhancedFields,
						field_count: Object.keys(enhancedFields).length,
						relational_fields: relationalFields,
						fields_to_resolve_example:
							relationalFields.length > 0
								? {
										description:
											'Example of how to resolve relational fields in searches',
										example: `
// Example of how to search using relational fields
smart_search({
  model: "${model}",
  search_criteria: { /* your direct criteria here */ },
  fields_to_resolve: [
    {
      relation_field: "${
				relationalFields[0]?.field_name || 'field_name'
			}",
      relation_model: "${
				relationalFields[0]?.relation_model || 'related_model'
			}",
      search_field: "${relationalFields[0]?.search_field || 'name'}",
      search_value: "value to search for"
    }
  ]
})
          `,
								  }
								: null,
					}),
				},
			],
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(
			`Failed to get fields for model ${model}:`,
			errorMessage
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						model,
						error: errorMessage,
					}),
				},
			],
		};
	}
}

export const getModelFieldsObject = {
	name: 'getModelFields',
	description: `Get metadata about all fields for a specified Odoo model, including field types, relations, and other properties. 

USE THIS TOOL WHEN:
• You need to understand what fields are available in a model before searching
• User asks about model structure: "What fields does res.partner have?"
• You're unsure about field names: "Does product have a 'category' or 'categ_id' field?"
• Planning complex searches involving relational fields
• User wants to know searchable/filterable fields

WHEN NOT TO USE:
• You already know the field names you need for a search
• For common models (res.partner, product.product) where standard fields are well-known
• Just to search - use smart_search directly if you know the field names

HELPFUL FOR SMART_SEARCH PLANNING:
This tool identifies relational fields that need special handling in smart_search. Look for:
• Fields with type "many2one" or "many2many" 
• The "relation" property shows which model to search in
• Use these insights to build proper fields_to_resolve arrays

EXAMPLE WORKFLOW:
1. User: "Find products in electronics category"
2. You: get_model_fields(model: "product.product") → discover "categ_id" field relates to "product.category"
3. You: smart_search with fields_to_resolve: [{relation_field: "categ_id", relation_model: "product.category", search_field: "name", search_value: "Electronics"}]`,
	input: zodInputSchema,
	cb: getModelFields,
};
