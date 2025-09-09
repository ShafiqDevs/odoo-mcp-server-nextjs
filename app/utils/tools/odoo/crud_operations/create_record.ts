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

// Define schema for record data
const recordDataSchema = z
	.record(z.any())
	.describe(
		'Field-value pairs for the new record. Example: {"name": "John Doe", "email": "john@example.com", "phone": "+1234567890"}'
	);

export const create_records = tool({
	name: 'create_records',
	description: `Create new records in any Odoo model. Can create single or multiple records in one operation.

FIELD VALUE GUIDELINES:
• Text fields: Use strings ("name": "John Doe")  
• Boolean fields: Use true/false ("active": true)
• Numeric fields: Use numbers ("age": 30)
• Date fields: Use ISO format ("date": "2025-01-15") 
• Many2one relations: Use ID numbers ("country_id": 233)
• Many2many relations: Use array of IDs ("category_ids": [1, 2, 3])

COMMON FIELD PATTERNS:
• Required fields vary by model - include at minimum the "name" field for most models
• For res.partner: name is required, email/phone/address are optional
• For product.product: name is required, categ_id recommended  
• For sale.order: partner_id is required

RELATIONAL FIELD SETUP:
If you need to link to other records, first use smart_search to find the related record IDs, then use those IDs in the create operation.

EXAMPLES:
• Create partner: [{"name": "John Smith", "email": "john@test.com", "phone": "+1234567890"}]
• Create multiple partners: [{"name": "Alice"}, {"name": "Bob", "email": "bob@test.com"}]
• Create with relations: [{"name": "New Partner", "country_id": 233, "category_ids": [1, 5]}]`,

	inputSchema: z.object({
		connection: connectionSchema.describe(
			'The established Odoo connection object'
		),

		model: z
			.string()
			.describe(
				'The Odoo model to create records in (e.g., "res.partner", "product.product", "sale.order")'
			),

		records_data: z
			.array(recordDataSchema)
			.min(1)
			.describe(
				'Array of objects containing field-value pairs for each record to create. Each object represents one new record.'
			),

		fields_to_return: z
			.array(z.string())
			.optional()
			.describe(
				'Optional list of fields to return in the response. If not specified, returns all fields for the created records'
			),
	}),

	execute: async (input) => {
		const { connection, model, records_data, fields_to_return } =
			input;

		const client = new OdooJsonRpcClient();

		try {
			console.log(
				`Creating ${records_data.length} record(s) in model: ${model}`
			);
			console.log(
				'Records data:',
				JSON.stringify(records_data, null, 2)
			);

			// Step 1: Create the records using Odoo's create method
			const createdIds = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'create',
					records_data, // Array of record data objects
				]
			);

			console.log(
				`Successfully created records with IDs:`,
				createdIds
			);

			// Step 2: Read back the created records to return full data
			const createdRecords = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'read',
					Array.isArray(createdIds) ? createdIds : [createdIds], // Handle single ID or array
					fields_to_return || [], // Empty array returns all fields
				]
			);

			console.log(
				`Retrieved ${createdRecords?.length || 0} created records`
			);

			// Step 3: Process and format the response
			const processedRecords = createdRecords
				? createdRecords.map((record: any) => {
						// Return the record as-is from Odoo
						return record;
				  })
				: [];

			return {
				success: true,
				model,
				created_count: Array.isArray(createdIds)
					? createdIds.length
					: 1,
				created_records: processedRecords,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Failed to create records in model ${model}:`,
				errorMessage
			);

			// Enhanced error handling with common issues
			let enhancedError = errorMessage;
			if (errorMessage.includes('required')) {
				enhancedError +=
					'\n\nTip: Check if all required fields are provided. Use get_model_fields to see required fields for this model.';
			}
			if (errorMessage.includes('relation')) {
				enhancedError +=
					'\n\nTip: For relational fields, ensure you use valid IDs. Use smart_search to find the correct IDs first.';
			}
			if (errorMessage.includes('access')) {
				enhancedError +=
					'\n\nTip: Check if you have create permissions for this model.';
			}

			return {
				success: false,
				model,
				error: enhancedError,
				failed_records: records_data,
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
			'The Odoo model to create records in (e.g., "res.partner", "product.product", "sale.order")'
		),

	records_data: z
		.array(recordDataSchema)
		.min(1)
		.describe(
			'Array of objects containing field-value pairs for each record to create. Each object represents one new record.'
		),

	fields_to_return: z
		.array(z.string())
		.optional()
		.describe(
			'Optional list of fields to return in the response. If not specified, returns all fields for the created records'
		),
});

type InputSchema = z.infer<typeof zodInputSchema>;

// Function for MCP server.tool()
async function createRecords(input: InputSchema): Promise<ToolReturn> {
	const { connection, model, records_data, fields_to_return } = input;
	const client = new OdooJsonRpcClient();

	try {
		console.log(
			`Creating ${records_data.length} record(s) in model: ${model}`
		);
		console.log('Records data:', JSON.stringify(records_data, null, 2));

		// Step 1: Create the records using Odoo's create method
		const createdIds = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'create',
				records_data, // Array of record data objects
			]
		);

		console.log(`Successfully created records with IDs:`, createdIds);

		// Step 2: Read back the created records to return full data
		const createdRecords = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'read',
				Array.isArray(createdIds) ? createdIds : [createdIds], // Handle single ID or array
				fields_to_return || [], // Empty array returns all fields
			]
		);

		console.log(
			`Retrieved ${createdRecords?.length || 0} created records`
		);

		// Step 3: Process and format the response
		const processedRecords = createdRecords
			? createdRecords.map((record: any) => {
					// Return the record as-is from Odoo
					return record;
			  })
			: [];

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						model,
						created_count: Array.isArray(createdIds)
							? createdIds.length
							: 1,
						created_records: processedRecords,
					}),
				},
			],
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(
			`Failed to create records in model ${model}:`,
			errorMessage
		);

		// Enhanced error handling with common issues
		let enhancedError = errorMessage;
		if (errorMessage.includes('required')) {
			enhancedError +=
				'\n\nTip: Check if all required fields are provided. Use get_model_fields to see required fields for this model.';
		}
		if (errorMessage.includes('relation')) {
			enhancedError +=
				'\n\nTip: For relational fields, ensure you use valid IDs. Use smart_search to find the correct IDs first.';
		}
		if (errorMessage.includes('access')) {
			enhancedError +=
				'\n\nTip: Check if you have create permissions for this model.';
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						model,
						error: enhancedError,
						failed_records: records_data,
					}),
				},
			],
		};
	}
}

// Export object for MCP server
export const createRecordsObject = {
	name: 'createRecords',
	description: `Create new records in any Odoo model. Can create single or multiple records in one operation.

FIELD VALUE GUIDELINES:
• Text fields: Use strings ("name": "John Doe")  
• Boolean fields: Use true/false ("active": true)
• Numeric fields: Use numbers ("age": 30)
• Date fields: Use ISO format ("date": "2025-01-15") 
• Many2one relations: Use ID numbers ("country_id": 233)
• Many2many relations: Use array of IDs ("category_ids": [1, 2, 3])

COMMON FIELD PATTERNS:
• Required fields vary by model - include at minimum the "name" field for most models
• For res.partner: name is required, email/phone/address are optional
• For product.product: name is required, categ_id recommended  
• For sale.order: partner_id is required

RELATIONAL FIELD SETUP:
If you need to link to other records, first use smart_search to find the related record IDs, then use those IDs in the create operation.

EXAMPLES:
• Create partner: [{"name": "John Smith", "email": "john@test.com", "phone": "+1234567890"}]
• Create multiple partners: [{"name": "Alice"}, {"name": "Bob", "email": "bob@test.com"}]
• Create with relations: [{"name": "New Partner", "country_id": 233, "category_ids": [1, 5]}]`,
	input: zodInputSchema,
	cb: createRecords,
};
