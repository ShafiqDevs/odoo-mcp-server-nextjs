import { tool } from 'ai';
import z from 'zod';
import jayson from 'jayson/promise';

interface OdooConnection {
	url: string;
	db: string;
	uid: number;
	password: string;
	sessionId?: string;
	context: Record<string, any>;
}

class OdooJsonRpcClient {
	private createClient(url: string): jayson.HttpClient {
		const endpoint = `${url.replace(/\/+$/, '')}/jsonrpc`;
		return jayson.Client.http({
			port:
				new URL(endpoint).port ||
				(new URL(endpoint).protocol === 'https:' ? 443 : 80),
			hostname: new URL(endpoint).hostname,
			path: new URL(endpoint).pathname,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	}

	async call(
		url: string,
		service: string,
		method: string,
		args: any[]
	): Promise<any> {
		const client = this.createClient(url);

		try {
			const response = await client.request('call', {
				service,
				method,
				args,
			});

			if (response.error) {
				throw new Error(
					`Odoo Error ${response.error.code}: ${response.error.message}`
				);
			}

			return response.result;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`JSON-RPC call failed: ${error.message}`);
			}
			throw new Error('JSON-RPC call failed: Unknown error');
		}
	}

	async authenticate(
		url: string,
		db: string,
		username: string,
		password: string
	): Promise<number> {
		const result = await this.call(url, 'common', 'authenticate', [
			db,
			username,
			password,
			{},
		]);

		if (!result || typeof result !== 'number') {
			throw new Error(
				'Authentication failed: Invalid credentials or server response'
			);
		}

		return result;
	}

	async getServerVersion(url: string): Promise<any> {
		return await this.call(url, 'common', 'version', []);
	}

	async checkUserAccess(
		url: string,
		db: string,
		uid: number,
		password: string
	): Promise<boolean> {
		try {
			// Try to call a simple method to verify the connection works
			const result = await this.call(url, 'object', 'execute', [
				db,
				uid,
				password,
				'res.users',
				'read',
				[uid],
				['id', 'name', 'login'],
			]);

			// If we can read the user record, the connection is valid
			return (
				Array.isArray(result) &&
				result.length > 0 &&
				result[0].id === uid
			);
		} catch (error) {
			console.error('Connection verification error:', error);
			return false;
		}
	}
}

export const establish_odoo_connection = tool({
	name: 'establish_odoo_connection',
	description:
		'Establish a connection to an Odoo instance using JSON-RPC (Jayson library) and validate the credentials.',
	inputSchema: z.object({
		url: z
			.string()
			.url()
			.describe(
				'The URL of the Odoo instance (e.g., http://localhost:8069).'
			),
		db: z.string().min(2).max(100).describe('The database name.'),
		username: z
			.string()
			.min(1)
			.describe('The username for authentication.'),
		password: z
			.string()
			.min(1)
			.describe('The password for authentication.'),
	}),
	execute: async (
		input
	): Promise<{
		success: boolean;
		connection?: OdooConnection;
		serverInfo?: any;
		error?: string;
	}> => {
		const { url, db, username, password } = input;
		const client = new OdooJsonRpcClient();

		try {
			console.log(
				'Establishing Odoo connection using Jayson JSON-RPC...'
			);
			console.log(`URL: ${url}`);
			console.log(`Database: ${db}`);
			console.log(`Username: ${username}`);

			// Step 1: Get server version info
			console.log('Getting server information...');
			const serverInfo = await client.getServerVersion(url);
			console.log('Server info:', serverInfo);

			// Step 2: Authenticate user
			console.log('Authenticating user...');
			const uid = await client.authenticate(
				url,
				db,
				username,
				password
			);
			console.log(`Authentication successful. User ID: ${uid}`);

			// Step 3: Verify the connection by checking user access
			console.log('Verifying connection...');
			const hasAccess = await client.checkUserAccess(
				url,
				db,
				uid,
				password
			);

			if (!hasAccess) {
				throw new Error('Connection verification failed');
			}

			// Step 4: Create connection object
			const connection: OdooConnection = {
				url: url.replace(/\/+$/, ''),
				db,
				uid,
				password,
				context: {
					lang: 'en_US',
					tz: 'UTC',
				},
			};

			console.log(
				'Odoo connection established successfully using Jayson!'
			);

			return {
				success: true,
				connection,
				serverInfo,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Unknown error occurred';
			console.error(
				'Failed to establish Odoo connection:',
				errorMessage
			);

			return {
				success: false,
				error: errorMessage,
			};
		}
	},
});

// Export the client class for potential reuse
export { OdooJsonRpcClient, type OdooConnection };

// function to feed to MCP server.tool()
export async function connectToOdoo(input: {
	url: string;
	db: string;
	username: string;
	password: string;
}): Promise<{ content: [{ type: 'text'; text: string }] }> {
	{
		const { url, db, username, password } = input;
		const client = new OdooJsonRpcClient();

		try {
			console.log(
				'Establishing Odoo connection using Jayson JSON-RPC...'
			);
			console.log(`URL: ${url}`);
			console.log(`Database: ${db}`);
			console.log(`Username: ${username}`);

			// Step 1: Get server version info
			console.log('Getting server information...');
			const serverInfo = await client.getServerVersion(url);
			console.log('Server info:', serverInfo);

			// Step 2: Authenticate user
			console.log('Authenticating user...');
			const uid = await client.authenticate(
				url,
				db,
				username,
				password
			);
			console.log(`Authentication successful. User ID: ${uid}`);

			// Step 3: Verify the connection by checking user access
			console.log('Verifying connection...');
			const hasAccess = await client.checkUserAccess(
				url,
				db,
				uid,
				password
			);

			if (!hasAccess) {
				throw new Error('Connection verification failed');
			}

			// Step 4: Create connection object
			const connection: OdooConnection = {
				url: url.replace(/\/+$/, ''),
				db,
				uid,
				password,
				context: {
					lang: 'en_US',
					tz: 'UTC',
				},
			};

			console.log(
				'Odoo connection established successfully using Jayson!'
			);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: true,
							connection,
							serverInfo,
						}),
					},
				],
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Unknown error occurred';
			console.error(
				'Failed to establish Odoo connection:',
				errorMessage
			);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: errorMessage,
						}),
					},
				],
			};
		}
	}
}
