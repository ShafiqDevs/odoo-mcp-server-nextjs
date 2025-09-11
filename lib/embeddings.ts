import OpenAI from 'openai';

/**
 * Embedding utilities for generating vector embeddings using OpenAI
 */

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAI({
    apiKey,
  });
}

/**
 * Generate embedding for a single text string
 * @param text - Text to generate embedding for
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const openai = getOpenAIClient();
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.trim(),
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.filter(text => text && text.trim().length > 0);
  
  if (validTexts.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  
  try {
    // OpenAI has a limit on batch size, so we may need to chunk
    const batchSize = 100; // OpenAI's recommended batch size
    const embeddings: number[][] = [];
    
    for (let i = 0; i < validTexts.length; i += batchSize) {
      const batch = validTexts.slice(i, i + batchSize);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: batch.map(text => text.trim()),
      });

      if (!response.data || response.data.length !== batch.length) {
        throw new Error(`Expected ${batch.length} embeddings, got ${response.data?.length || 0}`);
      }

      embeddings.push(...response.data.map(item => item.embedding));
    }

    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Validate that an array is a valid embedding vector
 * @param embedding - Array to validate
 * @returns True if valid embedding
 */
export function isValidEmbedding(embedding: any): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.length === 1536 && // OpenAI ada-002 embedding dimension
    embedding.every(val => typeof val === 'number' && !isNaN(val))
  );
}