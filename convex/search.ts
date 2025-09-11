import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Vector search for finding relevant knowledge chunks
 * Note: Vector search MUST be an action in Convex (not a query)
 * But we'll keep it minimal and do the heavy lifting in Next.js server actions
 */

// Query to get embeddings count (for debugging)
export const getEmbeddingsCount = query({
  args: {},
  handler: async (ctx) => {
    const embeddings = await ctx.db.query("embeddings").collect();
    return embeddings.length;
  },
});

// Query to get a single embedding by ID
export const getEmbedding = query({
  args: {
    id: v.id("embeddings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Vector search action - minimal, just returns IDs and scores
// The actual document fetching will be done in the Next.js server action
export const vectorSearch = action({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Perform vector search using Convex's built-in vector search
    const results = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: args.embedding,
      limit: limit,
    });
    
    // Just return the search results with IDs and scores
    // The Next.js server action will fetch the actual documents
    return results;
  },
});