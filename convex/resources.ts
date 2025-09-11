import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Resource management mutations and queries for the knowledge base
 */

// Mutation to add a resource to the database
export const addResource = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const resourceId = await ctx.db.insert("resources", {
      content: args.content,
    });
    return resourceId;
  },
});

// Mutation to update a resource
export const updateResource = mutation({
  args: {
    id: v.id("resources"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      content: args.content,
    });
    return { success: true };
  },
});

// Mutation to delete a resource
export const deleteResource = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Query to get all resources
export const listResources = query({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db.query("resources").collect();
    return resources;
  },
});

// Query to get a single resource
export const getResource = query({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    return resource;
  },
});

// Mutation to add embeddings for a resource
export const addEmbeddings = mutation({
  args: {
    resource_id: v.id("resources"),
    embeddings: v.array(v.object({
      content: v.string(),
      embedding: v.array(v.float64()),
    })),
  },
  handler: async (ctx, args) => {
    const insertPromises = args.embeddings.map(item =>
      ctx.db.insert("embeddings", {
        resource_id: args.resource_id,
        content: item.content,
        embedding: item.embedding,
      })
    );
    
    await Promise.all(insertPromises);
    return { success: true, count: args.embeddings.length };
  },
});

// Mutation to delete all embeddings for a resource
export const deleteEmbeddingsByResourceId = mutation({
  args: {
    resource_id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const embeddings = await ctx.db
      .query("embeddings")
      .filter((q) => q.eq(q.field("resource_id"), args.resource_id))
      .collect();
    
    const deletePromises = embeddings.map(embedding =>
      ctx.db.delete(embedding._id)
    );
    
    await Promise.all(deletePromises);
    return { success: true, count: embeddings.length };
  },
});