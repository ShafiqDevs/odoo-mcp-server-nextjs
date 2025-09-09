import {
	connectionSchema,
	getModelFieldsObject,
} from '@/app/utils/tools/odoo/crud_operations/get_model_fields';
import { createRecordsObject } from '@/app/utils/tools/odoo/crud_operations/create_record';
import { deleteRecordObject } from '@/app/utils/tools/odoo/crud_operations/delete_record';
import { smartSearchObject } from '@/app/utils/tools/odoo/crud_operations/smart_search';
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
			),
			server.tool(
				createRecordsObject.name,
				createRecordsObject.description,
				createRecordsObject.input.shape,
				createRecordsObject.cb
			),
			server.tool(
				deleteRecordObject.name,
				deleteRecordObject.description,
				deleteRecordObject.input.shape,
				deleteRecordObject.cb
			),
			server.tool(
				smartSearchObject.name,
				smartSearchObject.description,
				smartSearchObject.input.shape,
				smartSearchObject.cb
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
				[createRecordsObject.name]: {
					description: createRecordsObject.description,
				},
				[deleteRecordObject.name]: {
					description: deleteRecordObject.description,
				},
				[smartSearchObject.name]: {
					description: smartSearchObject.description,
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
