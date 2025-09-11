import { ConvexHttpClient } from "convex/browser";

/**
 * Convex client setup for server-side usage
 */

let convexClient: ConvexHttpClient | null = null;

/**
 * Get or create a Convex HTTP client
 * @returns ConvexHttpClient instance
 */
export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    }
    
    convexClient = new ConvexHttpClient(convexUrl);
  }
  
  return convexClient;
}

/**
 * Helper to call Convex actions
 */
export async function callConvexAction<T = any>(
  actionName: string,
  args: any
): Promise<T> {
  const client = getConvexClient();
  
  try {
    // Parse the action name to get the correct format
    // Format: "filename:functionName" -> api.filename.functionName
    const [file, func] = actionName.split(":");
    const action = `api.${file}.${func}`;
    
    const result = await client.action(action as any, args);
    return result as T;
  } catch (error) {
    console.error(`Error calling Convex action ${actionName}:`, error);
    throw error;
  }
}

/**
 * Helper to call Convex queries
 */
export async function callConvexQuery<T = any>(
  queryName: string,
  args: any
): Promise<T> {
  const client = getConvexClient();
  
  try {
    // Parse the query name to get the correct format
    const [file, func] = queryName.split(":");
    const query = `api.${file}.${func}`;
    
    const result = await client.query(query as any, args);
    return result as T;
  } catch (error) {
    console.error(`Error calling Convex query ${queryName}:`, error);
    throw error;
  }
}

/**
 * Helper to call Convex mutations
 */
export async function callConvexMutation<T = any>(
  mutationName: string,
  args: any
): Promise<T> {
  const client = getConvexClient();
  
  try {
    // Parse the mutation name to get the correct format
    const [file, func] = mutationName.split(":");
    const mutation = `api.${file}.${func}`;
    
    const result = await client.mutation(mutation as any, args);
    return result as T;
  } catch (error) {
    console.error(`Error calling Convex mutation ${mutationName}:`, error);
    throw error;
  }
}