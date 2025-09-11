import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Vector search for finding relevant knowledge chunks
 */

// Query to get embeddings count (for debugging)
export const getEmbeddingsCount = query({
  args: {},
  handler: async (ctx) => {
    const embeddings = await ctx.db.query("embeddings").collect();
    return embeddings.length;
  },
});

// Vector search action - must be an action because vector search is not available in queries
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
    
    return results;
  },
});