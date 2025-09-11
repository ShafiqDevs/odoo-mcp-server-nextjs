"use server";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { chunkOdooKnowledge } from "@/lib/chunking";
import { generateEmbedding, generateEmbeddings } from "@/lib/embeddings";

/**
 * Next.js Server Actions for Knowledge Base Management
 */

// Get Convex client
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return new ConvexHttpClient(url);
}

/**
 * Add a new resource to the knowledge base
 * Automatically chunks the content and generates embeddings
 */
export async function addResourceAction(content: string) {
  try {
    const client = getConvexClient();
    
    // Step 1: Add resource to database
    const resourceId = await client.mutation(api.resources.addResource, {
      content,
    });
    
    // Step 2: Generate chunks from content
    const chunks = chunkOdooKnowledge(content);
    
    if (chunks.length === 0) {
      return {
        id: resourceId,
        success: true,
      };
    }
    
    // Step 3: Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddings(chunkTexts);
    
    // Step 4: Store embeddings in database
    const embeddingData = chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: embeddings[index],
    }));
    
    await client.mutation(api.resources.addEmbeddings, {
      resource_id: resourceId,
      embeddings: embeddingData,
    });
    
    return {
      id: resourceId,
      success: true,
    };
  } catch (error) {
    console.error("Error adding resource:", error);
    return {
      id: null,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing resource
 * Re-generates chunks and embeddings
 */
export async function updateResourceAction(id: Id<"resources">, content: string) {
  try {
    const client = getConvexClient();
    
    // Step 1: Update resource content
    await client.mutation(api.resources.updateResource, {
      id,
      content,
    });
    
    // Step 2: Delete existing embeddings
    await client.mutation(api.resources.deleteEmbeddingsByResourceId, {
      resource_id: id,
    });
    
    // Step 3: Generate new chunks
    const chunks = chunkOdooKnowledge(content);
    
    if (chunks.length === 0) {
      return { success: true };
    }
    
    // Step 4: Generate new embeddings
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddings(chunkTexts);
    
    // Step 5: Store new embeddings
    const embeddingData = chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: embeddings[index],
    }));
    
    await client.mutation(api.resources.addEmbeddings, {
      resource_id: id,
      embeddings: embeddingData,
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating resource:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a resource and all its embeddings
 */
export async function deleteResourceAction(id: Id<"resources">) {
  try {
    const client = getConvexClient();
    
    // Step 1: Delete all embeddings for this resource
    await client.mutation(api.resources.deleteEmbeddingsByResourceId, {
      resource_id: id,
    });
    
    // Step 2: Delete the resource itself
    await client.mutation(api.resources.deleteResource, {
      id,
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting resource:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all resources
 */
export async function listResourcesAction() {
  try {
    const client = getConvexClient();
    const resources = await client.query(api.resources.listResources, {});
    return {
      success: true,
      resources,
    };
  } catch (error) {
    console.error("Error listing resources:", error);
    return {
      success: false,
      resources: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search the knowledge base
 */
export async function searchKnowledgeAction(
  query: string,
  limit: number = 5,
  threshold: number = 0.7
) {
  try {
    const client = getConvexClient();
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Perform vector search
    const searchResults = await client.action(api.search.vectorSearch, {
      embedding: queryEmbedding,
      limit: limit * 2, // Get more to filter by threshold
    });
    
    if (!searchResults || searchResults.length === 0) {
      return {
        success: true,
        results: [],
        query,
        message: "No relevant knowledge found",
      };
    }
    
    // Filter by threshold and limit
    const filteredResults = searchResults
      .filter((result: any) => result._score >= threshold)
      .slice(0, limit);
    
    // Format results
    const results = filteredResults.map((result: any) => ({
      content: result.content,
      confidence: result._score,
      resource_id: result.resource_id,
    }));
    
    return {
      success: true,
      results,
      query,
      message: `Found ${results.length} relevant results`,
    };
  } catch (error) {
    console.error("Error searching knowledge:", error);
    return {
      success: false,
      results: [],
      query,
      message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: true,
    };
  }
}