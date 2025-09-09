import {
	connectionSchema,
	getModelFieldsObject,
} from '@/app/utils/tools/odoo/crud_operations/get_model_fields';
import {
	connectToOdoo,
	connectToOdooObject,
} from '@/app/utils/tools/odoo/establish_connection';
import { createMcpHandler } from '@vercel/mcp-adapter';
import z from 'zod';

const handler = createMcpHandler(
	(server) => {
		server.tool(
			connectToOdooObject.name,
			connectToOdooObject.description,
			connectToOdooObject.input.shape,
			connectToOdooObject.cb
		),
			server.tool(
				getModelFieldsObject.name,
				getModelFieldsObject.description,
				getModelFieldsObject.input.shape,
				getModelFieldsObject.cb
			);
	},
	{
		capabilities: {
			tools: {
				[connectToOdooObject.name]: {
					description: connectToOdooObject.description,
				},
				[getModelFieldsObject.name]: {
					description: getModelFieldsObject.description,
				},
			},
		},
	},
	{
		redisUrl: process.env.REDIS_URL!,
		maxDuration: 60,
		verboseLogs: true,
		basePath: '/api/odoo-mcp',
	}
);

export { handler as GET, handler as POST, handler as DELETE };
