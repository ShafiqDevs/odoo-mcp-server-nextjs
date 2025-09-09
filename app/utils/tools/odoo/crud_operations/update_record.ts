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

export const update_record = tool({
	name: 'update_record',
	description: `Update a single existing record in any Odoo model using the record's numeric ID.

THIS TOOL ONLY UPDATES RECORDS - IT DOES NOT SEARCH FOR THEM.

REQUIREMENTS:
• Record ID must be a numeric ID (e.g., 123, not "John Smith")
• You must specify exactly which fields to update and their new values
• All relational field values must be numeric IDs

IF YOU DON'T HAVE THE RECORD ID:
Use smart_search first to find the record, then use this tool with the found ID.

IF MULTIPLE RECORDS MATCH A NAME:
1. Use smart_search to find all matching records
2. Ask user to specify which record by showing the options with distinguishing details
3. Only proceed with update_record once you have the specific numeric ID

FIELD VALUE TYPES:
• Text fields: "name": "New Name"
• Boolean fields: "active": true/false  
• Numeric fields: "price": 99.99
• Date fields: "date": "2025-01-15" (ISO format)
• Many2one relations: "category_id": 5 (numeric ID only)
• Many2many operations:
  - Replace all: "tag_ids": [1, 2, 3]
  - Add records: "tag_ids": [[4, 1], [4, 2]]
  - Remove records: "tag_ids": [[3, 1], [3, 2]]  
  - Clear all: "tag_ids": [[5]]

EXAMPLES:
• update_record({model: "res.partner", record_id: 123, updates: {"name": "John Updated", "email": "john@new.com"}})
• update_record({model: "product.product", record_id: 456, updates: {"list_price": 99.99, "active": true}})
• update_record({model: "res.partner", record_id: 789, updates: {"country_id": 233, "category_ids": [1, 5]}})`,

	inputSchema: z.object({
		connection: connectionSchema.describe(
			'The established Odoo connection object'
		),

		model: z
			.string()
			.describe(
				'The Odoo model name (e.g., "res.partner", "product.product", "sale.order")'
			),

		record_id: z
			.number()
			.int()
			.positive()
			.describe(
				"The numeric ID of the specific record to update (e.g., 123). If you don't have this, use smart_search first."
			),

		updates: z
			.record(z.any())
			.describe(
				'Object containing field-value pairs to update. Example: {"name": "New Name", "email": "new@email.com", "active": true}'
			),
	}),

	execute: async (input) => {
		const { connection, model, record_id, updates } = input;

		const client = new OdooJsonRpcClient();

		try {
			console.log(
				`Updating record ID ${record_id} in model: ${model}`
			);
			console.log('Updates:', JSON.stringify(updates, null, 2));

			// Validate that we have actual updates to apply
			if (!updates || Object.keys(updates).length === 0) {
				return {
					success: false,
					error: 'NO_UPDATES_SPECIFIED',
					message:
						'No field updates provided. Please specify which fields to update and their new values.',
					example: `updates: {"field_name": "new_value", "another_field": "another_value"}`,
				};
			}

			// Step 1: Update the record using Odoo's write method
			const writeResult = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'write',
					[record_id], // Array with single ID
					updates, // Updates object
				]
			);

			if (writeResult === true) {
				console.log(`Successfully updated record ID ${record_id}`);

				// Step 2: Read back the updated fields plus ID
				const fieldsToRead = ['id', ...Object.keys(updates)];

				const updatedRecord = await client.call(
					connection.url,
					'object',
					'execute',
					[
						connection.db,
						connection.uid,
						connection.password,
						model,
						'read',
						[record_id],
						fieldsToRead,
					]
				);

				if (updatedRecord && updatedRecord.length > 0) {
					console.log(`Retrieved updated record:`, updatedRecord[0]);

					return {
						success: true,
						model,
						updated_record: updatedRecord[0],
					};
				} else {
					return {
						success: false,
						error: 'READ_FAILED',
						message: `Update succeeded but could not retrieve the updated record with ID ${record_id}. The record may have been updated successfully.`,
					};
				}
			} else {
				return {
					success: false,
					error: 'WRITE_FAILED',
					message: `Odoo write operation failed for record ID ${record_id}. Please check if the record exists and you have write permissions.`,
				};
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Failed to update record ${record_id} in model ${model}:`,
				errorMessage
			);

			// Provide specific, actionable error messages
			if (
				errorMessage.includes('does not exist') ||
				errorMessage.includes('not found')
			) {
				return {
					success: false,
					error: 'RECORD_NOT_FOUND',
					message: `Record with ID ${record_id} does not exist in model ${model}.`,
					suggestion:
						"Use smart_search to find the correct record ID, or verify the record hasn't been deleted.",
				};
			}

			if (
				errorMessage.includes('relation') ||
				errorMessage.includes('foreign key')
			) {
				return {
					success: false,
					error: 'INVALID_RELATION',
					message: `One or more relational field values are invalid.`,
					suggestion:
						"For relational fields (ending in '_id'), use smart_search to find the correct numeric IDs for related records.",
				};
			}

			if (
				errorMessage.includes('access') ||
				errorMessage.includes('permission') ||
				errorMessage.includes('denied')
			) {
				return {
					success: false,
					error: 'ACCESS_DENIED',
					message: `You don't have permission to update this record or these fields.`,
					suggestion:
						'Check your user permissions for this model and record.',
				};
			}

			if (
				errorMessage.includes('readonly') ||
				errorMessage.includes('read-only')
			) {
				return {
					success: false,
					error: 'READONLY_FIELD',
					message: `One or more fields you're trying to update are read-only.`,
					suggestion:
						'Use get_model_fields to check which fields can be updated for this model.',
				};
			}

			if (
				errorMessage.includes('required') ||
				errorMessage.includes('mandatory')
			) {
				return {
					success: false,
					error: 'MISSING_REQUIRED_FIELD',
					message: `A required field is missing or being set to an invalid value.`,
					suggestion:
						'Use get_model_fields to see which fields are required for this model.',
				};
			}

			// Generic error fallback
			return {
				success: false,
				error: 'UPDATE_FAILED',
				message: `Update failed: ${errorMessage}`,
				suggestion:
					'Check the field names, values, and data types. Use get_model_fields for field information.',
			};
		}
	},
});

// Zod schema for MCP server.tool()
const zodInputSchema = z.object({
	connection: connectionSchema.describe(
		'The established Odoo connection object'
	),

	model: z
		.string()
		.describe(
			'The Odoo model name (e.g., "res.partner", "product.product", "sale.order")'
		),

	record_id: z
		.number()
		.int()
		.positive()
		.describe(
			"The numeric ID of the specific record to update (e.g., 123). If you don't have this, use smart_search first."
		),

	updates: z
		.record(z.any())
		.describe(
			'Object containing field-value pairs to update. Example: {"name": "New Name", "email": "new@email.com", "active": true}'
		),
});

type InputSchema = z.infer<typeof zodInputSchema>;

// Function for MCP server.tool()
async function updateRecord(input: InputSchema): Promise<ToolReturn> {
	const { connection, model, record_id, updates } = input;
	const client = new OdooJsonRpcClient();

	try {
		console.log(`Updating record ID ${record_id} in model: ${model}`);
		console.log('Updates:', JSON.stringify(updates, null, 2));

		// Validate that we have actual updates to apply
		if (!updates || Object.keys(updates).length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'NO_UPDATES_SPECIFIED',
							message:
								'No field updates provided. Please specify which fields to update and their new values.',
							example: `updates: {"field_name": "new_value", "another_field": "another_value"}`,
						}),
					},
				],
			};
		}

		// Step 1: Update the record using Odoo's write method
		const writeResult = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'write',
				[record_id], // Array with single ID
				updates, // Updates object
			]
		);

		if (writeResult === true) {
			console.log(`Successfully updated record ID ${record_id}`);

			// Step 2: Read back the updated fields plus ID
			const fieldsToRead = ['id', ...Object.keys(updates)];

			const updatedRecord = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'read',
					[record_id],
					fieldsToRead,
				]
			);

			if (updatedRecord && updatedRecord.length > 0) {
				console.log(`Retrieved updated record:`, updatedRecord[0]);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								success: true,
								model,
								updated_record: updatedRecord[0],
							}),
						},
					],
				};
			} else {
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								success: false,
								error: 'READ_FAILED',
								message: `Update succeeded but could not retrieve the updated record with ID ${record_id}. The record may have been updated successfully.`,
							}),
						},
					],
				};
			}
		} else {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'WRITE_FAILED',
							message: `Odoo write operation failed for record ID ${record_id}. Please check if the record exists and you have write permissions.`,
						}),
					},
				],
			};
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(
			`Failed to update record ${record_id} in model ${model}:`,
			errorMessage
		);

		// Provide specific, actionable error messages
		if (
			errorMessage.includes('does not exist') ||
			errorMessage.includes('not found')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'RECORD_NOT_FOUND',
							message: `Record with ID ${record_id} does not exist in model ${model}.`,
							suggestion:
								"Use smart_search to find the correct record ID, or verify the record hasn't been deleted.",
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('relation') ||
			errorMessage.includes('foreign key')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'INVALID_RELATION',
							message: `One or more relational field values are invalid.`,
							suggestion:
								"For relational fields (ending in '_id'), use smart_search to find the correct numeric IDs for related records.",
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('access') ||
			errorMessage.includes('permission') ||
			errorMessage.includes('denied')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'ACCESS_DENIED',
							message: `You don't have permission to update this record or these fields.`,
							suggestion:
								'Check your user permissions for this model and record.',
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('readonly') ||
			errorMessage.includes('read-only')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'READONLY_FIELD',
							message: `One or more fields you're trying to update are read-only.`,
							suggestion:
								'Use get_model_fields to check which fields can be updated for this model.',
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('required') ||
			errorMessage.includes('mandatory')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'MISSING_REQUIRED_FIELD',
							message: `A required field is missing or being set to an invalid value.`,
							suggestion:
								'Use get_model_fields to see which fields are required for this model.',
						}),
					},
				],
			};
		}

		// Generic error fallback
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						error: 'UPDATE_FAILED',
						message: `Update failed: ${errorMessage}`,
						suggestion:
							'Check the field names, values, and data types. Use get_model_fields for field information.',
					}),
				},
			],
		};
	}
}

// Export object for MCP server
export const updateRecordObject = {
	name: 'updateRecord',
	description: `Update a single existing record in any Odoo model using the record's numeric ID.

THIS TOOL ONLY UPDATES RECORDS - IT DOES NOT SEARCH FOR THEM.

REQUIREMENTS:
• Record ID must be a numeric ID (e.g., 123, not "John Smith")
• You must specify exactly which fields to update and their new values
• All relational field values must be numeric IDs

IF YOU DON'T HAVE THE RECORD ID:
Use smart_search first to find the record, then use this tool with the found ID.

IF MULTIPLE RECORDS MATCH A NAME:
1. Use smart_search to find all matching records
2. Ask user to specify which record by showing the options with distinguishing details
3. Only proceed with update_record once you have the specific numeric ID

FIELD VALUE TYPES:
• Text fields: "name": "New Name"
• Boolean fields: "active": true/false  
• Numeric fields: "price": 99.99
• Date fields: "date": "2025-01-15" (ISO format)
• Many2one relations: "category_id": 5 (numeric ID only)
• Many2many operations:
  - Replace all: "tag_ids": [1, 2, 3]
  - Add records: "tag_ids": [[4, 1], [4, 2]]
  - Remove records: "tag_ids": [[3, 1], [3, 2]]  
  - Clear all: "tag_ids": [[5]]

EXAMPLES:
• update_record({model: "res.partner", record_id: 123, updates: {"name": "John Updated", "email": "john@new.com"}})
• update_record({model: "product.product", record_id: 456, updates: {"list_price": 99.99, "active": true}})
• update_record({model: "res.partner", record_id: 789, updates: {"country_id": 233, "category_ids": [1, 5]}})`,
	input: zodInputSchema,
	cb: updateRecord,
};
