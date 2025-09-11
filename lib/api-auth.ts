/**
 * API Authentication utilities for knowledge base management routes
 */

/**
 * Validate API key from request headers
 * @param request - The incoming request
 * @returns True if API key is valid, false otherwise
 */
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.KNOWLEDGE_API_KEY;
  
  if (!validApiKey) {
    console.error('KNOWLEDGE_API_KEY environment variable is not set');
    return false;
  }
  
  if (!apiKey) {
    return false;
  }
  
  return apiKey === validApiKey;
}

/**
 * Create an unauthorized response
 * @param message - Optional error message
 * @returns Response object with 401 status
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create an error response
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Response object with error
 */
export function errorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create a success response
 * @param data - Data to return
 * @param status - HTTP status code
 * @returns Response object with data
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}