import { NextRequest } from 'next/server';
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth';
import { addResourceAction, listResourcesAction } from '@/app/actions/knowledge';

/**
 * POST /api/knowledge/resources
 * Add a new resource to the knowledge base
 */
export async function POST(request: NextRequest) {
  // Check API key
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    // Parse request body
    const body = await request.json();
    
    if (!body.content || typeof body.content !== 'string') {
      return errorResponse('Content is required and must be a string', 400);
    }

    if (body.content.trim().length === 0) {
      return errorResponse('Content cannot be empty', 400);
    }

    // Add resource using server action
    const result = await addResourceAction(body.content);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to add resource', 500);
    }

    return successResponse({
      id: result.id,
      success: true,
      message: 'Resource added successfully'
    }, 201);
  } catch (error) {
    console.error('Error in POST /api/knowledge/resources:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * GET /api/knowledge/resources
 * List all resources in the knowledge base
 */
export async function GET(request: NextRequest) {
  // Check API key
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    // List all resources using server action
    const result = await listResourcesAction();
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to list resources', 500);
    }

    return successResponse({
      success: true,
      resources: result.resources,
      count: result.resources?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /api/knowledge/resources:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}