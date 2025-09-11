import { NextRequest } from 'next/server';
import { searchKnowledgeAction } from '@/app/actions/knowledge';

/**
 * Test endpoint for search functionality
 * POST /api/test-search
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Test search request:', {
      query: body.query,
      limit: body.limit || 5,
      threshold: body.threshold || 0.7
    });
    
    const result = await searchKnowledgeAction(
      body.query,
      body.limit || 5,
      body.threshold || 0.7
    );
    
    console.log('Search result:', {
      success: result.success,
      resultsCount: result.results?.length || 0,
      message: result.message
    });
    
    return Response.json(result);
  } catch (error) {
    console.error('Test search error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}