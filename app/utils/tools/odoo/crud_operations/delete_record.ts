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

export const delete_record = tool({
	name: 'delete_record',
	description: `Delete a single existing record from any Odoo model using the record's numeric ID.

THIS TOOL ONLY DELETES RECORDS - IT DOES NOT SEARCH FOR THEM.

CRITICAL SAFETY WARNING: 
DELETION IS PERMANENT AND CANNOT BE UNDONE. Use with extreme caution.

REQUIREMENTS:
• Record ID must be a numeric ID (e.g., 123, not "John Smith")
• You must confirm that this is the correct record to delete
• User must explicitly confirm deletion intent

IF YOU DON'T HAVE THE RECORD ID:
Use smart_search first to find the record, then use this tool with the found ID.

IF MULTIPLE RECORDS MATCH A NAME:
1. Use smart_search to find all matching records
2. Ask user to specify which record by showing the options with distinguishing details
3. Ask user to explicitly confirm deletion intent
4. Only proceed with delete_record once you have the specific numeric ID AND user confirmation

WHEN TO REFUSE DELETION:
• If user hasn't explicitly confirmed they want to delete the record
• If multiple records were found and user hasn't specified which one
• If the deletion would violate business logic (check with user first)

EXAMPLES:
• delete_record({model: "res.partner", record_id: 123})
• delete_record({model: "product.product", record_id: 456})
• delete_record({model: "sale.order", record_id: 789})

EXAMPLE WORKFLOW:
User: "delete partner john"
1. smart_search to find "john" → finds multiple records
2. Show options: "Found 3 partners named John. Which one to delete?"
3. User specifies: "John Smith with ID 123"
4. Confirm: "Are you sure you want to permanently delete John Smith (ID: 123)?"
5. User confirms: "yes"
6. delete_record({model: "res.partner", record_id: 123})`,

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
				"The numeric ID of the specific record to delete (e.g., 123). If you don't have this, use smart_search first."
			),

		confirmation: z
			.boolean()
			.default(false)
			.describe(
				'Confirmation that user explicitly wants to delete this record. Must be true to proceed with deletion.'
			),
	}),

	execute: async (input) => {
		const { connection, model, record_id, confirmation } = input;

		const client = new OdooJsonRpcClient();

		try {
			console.log(
				`Attempting to delete record ID ${record_id} in model: ${model}`
			);

			// Safety check: Require explicit confirmation
			if (!confirmation) {
				return {
					success: false,
					error: 'CONFIRMATION_REQUIRED',
					message: `Deletion requires explicit user confirmation. Please confirm that you want to permanently delete record ID ${record_id} from ${model}.`,
					suggestion:
						'Ask the user to explicitly confirm deletion intent, then set confirmation: true',
				};
			}

			// Step 1: First, try to read the record to confirm it exists and get its details
			let recordDetails = null;
			try {
				const recordData = await client.call(
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
						['id', 'name', 'display_name'], // Basic identifying fields
					]
				);

				if (recordData && recordData.length > 0) {
					recordDetails = recordData[0];
					console.log(`Found record to delete:`, recordDetails);
				}
			} catch (readError) {
				console.log(
					`Could not read record before deletion:`,
					readError
				);
			}

			// Step 2: Delete the record using Odoo's unlink method
			const deleteResult = await client.call(
				connection.url,
				'object',
				'execute',
				[
					connection.db,
					connection.uid,
					connection.password,
					model,
					'unlink',
					[record_id], // Array with single ID
				]
			);

			if (deleteResult === true) {
				console.log(`Successfully deleted record ID ${record_id}`);

				return {
					success: true,
					model,
					deleted_record_id: record_id,
					deleted_record_details: recordDetails,
					message: `Record ${record_id} has been permanently deleted from ${model}.`,
				};
			} else {
				return {
					success: false,
					error: 'DELETE_FAILED',
					message: `Odoo unlink operation failed for record ID ${record_id}. The record may not have been deleted.`,
				};
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Failed to delete record ${record_id} in model ${model}:`,
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
						"Use smart_search to find the correct record ID, or verify the record hasn't already been deleted.",
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
					message: `You don't have permission to delete this record.`,
					suggestion:
						'Check your user permissions for deleting records in this model.',
				};
			}

			if (
				errorMessage.includes('constraint') ||
				errorMessage.includes('foreign key') ||
				errorMessage.includes('reference')
			) {
				return {
					success: false,
					error: 'DELETION_BLOCKED',
					message: `Cannot delete this record because other records depend on it.`,
					suggestion:
						'You may need to delete or modify related records first, or check if this record is referenced elsewhere.',
				};
			}

			if (
				errorMessage.includes('workflow') ||
				errorMessage.includes('state')
			) {
				return {
					success: false,
					error: 'WORKFLOW_RESTRICTION',
					message: `Cannot delete this record due to its current state or workflow status.`,
					suggestion:
						'The record may need to be cancelled or moved to a different state before it can be deleted.',
				};
			}

			// Generic error fallback
			return {
				success: false,
				error: 'DELETION_FAILED',
				message: `Deletion failed: ${errorMessage}`,
				suggestion:
					'Check if the record exists and you have the necessary permissions to delete it.',
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
			"The numeric ID of the specific record to delete (e.g., 123). If you don't have this, use smart_search first."
		),

	confirmation: z
		.boolean()
		.default(false)
		.describe(
			'Confirmation that user explicitly wants to delete this record. Must be true to proceed with deletion.'
		),
});

type InputSchema = z.infer<typeof zodInputSchema>;

// Function for MCP server.tool()
async function deleteRecord(input: InputSchema): Promise<ToolReturn> {
	const { connection, model, record_id, confirmation } = input;
	const client = new OdooJsonRpcClient();

	try {
		console.log(
			`Attempting to delete record ID ${record_id} in model: ${model}`
		);

		// Safety check: Require explicit confirmation
		if (!confirmation) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'CONFIRMATION_REQUIRED',
							message: `Deletion requires explicit user confirmation. Please confirm that you want to permanently delete record ID ${record_id} from ${model}.`,
							suggestion:
								'Ask the user to explicitly confirm deletion intent, then set confirmation: true',
						}),
					},
				],
			};
		}

		// Step 1: First, try to read the record to confirm it exists and get its details
		let recordDetails = null;
		try {
			const recordData = await client.call(
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
					['id', 'name', 'display_name'], // Basic identifying fields
				]
			);

			if (recordData && recordData.length > 0) {
				recordDetails = recordData[0];
				console.log(`Found record to delete:`, recordDetails);
			}
		} catch (readError) {
			console.log(`Could not read record before deletion:`, readError);
		}

		// Step 2: Delete the record using Odoo's unlink method
		const deleteResult = await client.call(
			connection.url,
			'object',
			'execute',
			[
				connection.db,
				connection.uid,
				connection.password,
				model,
				'unlink',
				[record_id], // Array with single ID
			]
		);

		if (deleteResult === true) {
			console.log(`Successfully deleted record ID ${record_id}`);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: true,
							model,
							deleted_record_id: record_id,
							deleted_record_details: recordDetails,
							message: `Record ${record_id} has been permanently deleted from ${model}.`,
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
							error: 'DELETE_FAILED',
							message: `Odoo unlink operation failed for record ID ${record_id}. The record may not have been deleted.`,
						}),
					},
				],
			};
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(
			`Failed to delete record ${record_id} in model ${model}:`,
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
								"Use smart_search to find the correct record ID, or verify the record hasn't already been deleted.",
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
							message: `You don't have permission to delete this record.`,
							suggestion:
								'Check your user permissions for deleting records in this model.',
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('constraint') ||
			errorMessage.includes('foreign key') ||
			errorMessage.includes('reference')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'DELETION_BLOCKED',
							message: `Cannot delete this record because other records depend on it.`,
							suggestion:
								'You may need to delete or modify related records first, or check if this record is referenced elsewhere.',
						}),
					},
				],
			};
		}

		if (
			errorMessage.includes('workflow') ||
			errorMessage.includes('state')
		) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'WORKFLOW_RESTRICTION',
							message: `Cannot delete this record due to its current state or workflow status.`,
							suggestion:
								'The record may need to be cancelled or moved to a different state before it can be deleted.',
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
						error: 'DELETION_FAILED',
						message: `Deletion failed: ${errorMessage}`,
						suggestion:
							'Check if the record exists and you have the necessary permissions to delete it.',
					}),
				},
			],
		};
	}
}

// Export object for MCP server
export const deleteRecordObject = {
	name: 'deleteRecord',
	description: `Delete a single existing record from any Odoo model using the record's numeric ID.

THIS TOOL ONLY DELETES RECORDS - IT DOES NOT SEARCH FOR THEM.

CRITICAL SAFETY WARNING: 
DELETION IS PERMANENT AND CANNOT BE UNDONE. Use with extreme caution.

REQUIREMENTS:
• Record ID must be a numeric ID (e.g., 123, not "John Smith")
• You must confirm that this is the correct record to delete
• User must explicitly confirm deletion intent

IF YOU DON'T HAVE THE RECORD ID:
Use smart_search first to find the record, then use this tool with the found ID.

IF MULTIPLE RECORDS MATCH A NAME:
1. Use smart_search to find all matching records
2. Ask user to specify which record by showing the options with distinguishing details
3. Ask user to explicitly confirm deletion intent
4. Only proceed with delete_record once you have the specific numeric ID AND user confirmation

WHEN TO REFUSE DELETION:
• If user hasn't explicitly confirmed they want to delete the record
• If multiple records were found and user hasn't specified which one
• If the deletion would violate business logic (check with user first)

EXAMPLES:
• delete_record({model: "res.partner", record_id: 123})
• delete_record({model: "product.product", record_id: 456})
• delete_record({model: "sale.order", record_id: 789})

EXAMPLE WORKFLOW:
User: "delete partner john"
1. smart_search to find "john" → finds multiple records
2. Show options: "Found 3 partners named John. Which one to delete?"
3. User specifies: "John Smith with ID 123"
4. Confirm: "Are you sure you want to permanently delete John Smith (ID: 123)?"
5. User confirms: "yes"
6. delete_record({model: "res.partner", record_id: 123})`,
	input: zodInputSchema,
	cb: deleteRecord,
};
