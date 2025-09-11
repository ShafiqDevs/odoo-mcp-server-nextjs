import { NextRequest } from 'next/server';
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth';
import { updateResourceAction, deleteResourceAction } from '@/app/actions/knowledge';
import { Id } from '@/convex/_generated/dataModel';

/**
 * PUT /api/knowledge/resources/[id]
 * Update an existing resource
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check API key
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    const { id } = await params;
    const resourceId = id as Id<"resources">;
    
    // Parse request body
    const body = await request.json();
    
    if (!body.content || typeof body.content !== 'string') {
      return errorResponse('Content is required and must be a string', 400);
    }

    if (body.content.trim().length === 0) {
      return errorResponse('Content cannot be empty', 400);
    }

    // Update resource using server action
    const result = await updateResourceAction(resourceId, body.content);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to update resource', 500);
    }

    return successResponse({
      success: true,
      message: 'Resource updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/knowledge/resources/[id]:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * DELETE /api/knowledge/resources/[id]
 * Delete a resource and all its embeddings
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check API key
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    const { id } = await params;
    const resourceId = id as Id<"resources">;
    
    // Delete resource using server action
    const result = await deleteResourceAction(resourceId);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to delete resource', 500);
    }

    return successResponse({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/resources/[id]:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * GET /api/knowledge/resources/[id]
 * Get a specific resource (optional - for future use)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check API key
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    // await params but not using it yet
    await params;
    // For now, return not implemented
    // Can be implemented later if needed to get a specific resource
    return errorResponse('Get specific resource not implemented yet', 501);
  } catch (error) {
    console.error('Error in GET /api/knowledge/resources/[id]:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}