import { z } from 'zod';
import { ToolReturn } from '@/app/utils/types/mcp-tools';
import { searchKnowledgeAction } from '@/app/actions/knowledge';

/**
 * MCP Tool for searching the knowledge base
 * This tool allows AI agents to search for relevant information about Odoo models,
 * fields, queries, and best practices before using the Odoo CRUD tools.
 */

// Zod schema for input validation
const searchKnowledgeInputSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe(
			'Natural language search query (e.g., "How to search for partners in Odoo?", "What fields does res.partner have?")'
		),

	limit: z
		.number()
		.min(1)
		.max(10)
		.default(5)
		.optional()
		.describe(
			'Maximum number of results to return (1-10, default: 5)'
		),

	threshold: z
		.number()
		.min(0)
		.max(1)
		.default(0.7)
		.optional()
		.describe(
			'Minimum similarity score threshold (0-1, default: 0.7). Higher values return more relevant results.'
		),
});

type SearchKnowledgeInput = z.infer<
	typeof searchKnowledgeInputSchema
>;

/**
 * Search the knowledge base for relevant information
 */
async function searchKnowledge(
	input: SearchKnowledgeInput
): Promise<ToolReturn> {
	try {
		const { query, limit = 5, threshold = 0.7 } = input;

		console.log(`Searching knowledge base for: "${query}"`);
		console.log(`Limit: ${limit}, Threshold: ${threshold}`);

		// Call the server action to search
		const result = await searchKnowledgeAction(
			query,
			limit,
			threshold
		);

		if (!result.success) {
			console.error('Knowledge search failed:', result.message);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							message: result.message || 'Search failed',
							query,
							results: [],
						}),
					},
				],
			};
		}

		// Format the results for the AI agent
		const formattedResults = {
			success: true,
			query,
			message: result.message,
			resultCount: result.results.length,
			results: result.results.map((item: any, index: number) => ({
				rank: index + 1,
				content: item.content,
				confidence: item.confidence,
				resourceId: item.resource_id,
			})),
		};

		console.log(`Found ${result.results.length} relevant results`);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(formattedResults),
				},
			],
		};
	} catch (error) {
		console.error('Error in searchKnowledge tool:', error);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						message: `Error searching knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`,
						query: input.query,
						results: [],
					}),
				},
			],
		};
	}
}

// Export the tool configuration for MCP registration
export const searchKnowledgeObject = {
	name: 'searchKnowledge',
	description: `Search the knowledge base for information about Odoo models, fields, queries, and best practices.

USE THIS TOOL WHEN:
• Before using any Odoo CRUD tools - search for relevant documentation first
• User asks about Odoo models: "What is res.partner?", "How do I use sale.order?"
• User needs field information: "What fields are in product.product?"
• User needs query examples: "How to search for active partners?"
• User encounters errors: Search for error patterns and solutions
• Planning complex operations: Get best practices and examples

SEARCH TIPS:
• Use natural language queries: "How to create a partner in Odoo"
• Ask about specific models: "res.partner fields and relationships"
• Search for examples: "sale.order workflow examples"
• Look for error solutions: "Odoo access rights error"

OUTPUT FORMAT:
Returns a JSON object with:
- success: boolean indicating if search succeeded
- query: the original search query
- message: status message
- resultCount: number of results found
- results: array of relevant knowledge chunks, each with:
  - rank: result ranking (1 = most relevant)
  - content: the knowledge text
  - confidence: similarity score (0-1)
  - resourceId: source document reference

EXAMPLE USAGE:
searchKnowledge({
  query: "How to search for partners by email in Odoo?",
  limit: 3,
  threshold: 0.8
})`,
	input: searchKnowledgeInputSchema,
	cb: searchKnowledge,
};
