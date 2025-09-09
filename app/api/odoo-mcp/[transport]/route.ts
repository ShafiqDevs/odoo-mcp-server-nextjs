import { connectToOdoo } from '@/app/utils/tools/odoo/establish_connection';
import { createMcpHandler } from '@vercel/mcp-adapter';
import z from 'zod';

const handler = createMcpHandler(
	(server) => {
		server.tool(
			'getWeather',
			'A tool that provides weather information based on user location',
			{ location: z.string() },
			({ location }) => ({
				content: [
					{
						type: 'text',
						text: `The weather in ${location} is sunny with a high of 75°F.`,
					},
				],
			})
		);
		server.tool(
			'connectToOdoo',
			'A tool that connects to odoo instance using url, db, username and password',
			{
				url: z.string(),
				db: z.string(),
				username: z.string(),
				password: z.string(),
			},
			connectToOdoo
		);
	},
	{
		capabilities: {
			tools: {
				getWeather: {
					description:
						'A tool that provides weather information based on user location',
				},
				connectToOdoo: {
					description:
						'A tool that connects to odoo instance using url, db, username and password',
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
