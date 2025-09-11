/**
 * Text chunking utilities for breaking down large documents into smaller chunks
 * suitable for embedding generation and vector search
 */

import { CHUNK_CONFIG } from './config/optimization';

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

export interface TextChunk {
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Split text into chunks with overlap
 * @param text - The text to chunk
 * @param maxChunkSize - Maximum size of each chunk in characters (default 2000)
 * @param overlapSize - Number of characters to overlap between chunks (default 200)
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  maxChunkSize: number = CHUNK_CONFIG.chunkSize,
  overlapSize: number = CHUNK_CONFIG.overlapSize
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const cleanText = text.trim();
  
  // If text is smaller than max chunk size, return as single chunk
  if (cleanText.length <= maxChunkSize) {
    chunks.push({
      content: cleanText,
      metadata: {
        chunkIndex: 0,
        totalChunks: 1,
        startChar: 0,
        endChar: cleanText.length
      }
    });
    return chunks;
  }

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + maxChunkSize;
    
    // If this is not the last chunk, try to find a good break point
    if (endIndex < cleanText.length) {
      // Look for sentence endings (.!?) within the last 100 characters
      const searchStart = Math.max(startIndex + maxChunkSize - 100, startIndex);
      const searchEnd = Math.min(startIndex + maxChunkSize, cleanText.length);
      const searchText = cleanText.substring(searchStart, searchEnd);
      
      // Find the last sentence ending
      const sentenceEndMatch = searchText.match(/[.!?]\s/g);
      if (sentenceEndMatch) {
        const lastMatch = sentenceEndMatch[sentenceEndMatch.length - 1];
        const lastMatchIndex = searchText.lastIndexOf(lastMatch);
        endIndex = searchStart + lastMatchIndex + lastMatch.length;
      }
      // If no sentence ending, try to find a paragraph break
      else if (searchText.includes('\n\n')) {
        endIndex = searchStart + searchText.lastIndexOf('\n\n') + 2;
      }
      // If no paragraph break, try to find any newline
      else if (searchText.includes('\n')) {
        endIndex = searchStart + searchText.lastIndexOf('\n') + 1;
      }
      // If no newline, try to find a space
      else if (searchText.includes(' ')) {
        endIndex = searchStart + searchText.lastIndexOf(' ') + 1;
      }
    } else {
      endIndex = cleanText.length;
    }

    const chunkContent = cleanText.substring(startIndex, endIndex).trim();
    
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        metadata: {
          chunkIndex,
          totalChunks: -1, // Will be updated after all chunks are created
          startChar: startIndex,
          endChar: endIndex
        }
      });
      chunkIndex++;
    }

    // Move to next chunk with overlap
    if (endIndex < cleanText.length) {
      startIndex = Math.max(startIndex + 1, endIndex - overlapSize);
    } else {
      break;
    }
  }

  // Update total chunks count
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Chunk text specifically for Odoo knowledge base content
 * Preserves structure like model names, field names, and code blocks
 */
export function chunkOdooKnowledge(content: string): TextChunk[] {
  // Split by major sections first (if content has headers)
  const sections = content.split(/\n#{1,3}\s+/);
  
  const allChunks: TextChunk[] = [];
  
  sections.forEach(section => {
    // For Odoo content, use slightly larger chunks to preserve context
    const sectionChunks = chunkText(section, 3000, 300);
    allChunks.push(...sectionChunks);
  });

  // Re-index chunks
  allChunks.forEach((chunk, index) => {
    chunk.metadata.chunkIndex = index;
    chunk.metadata.totalChunks = allChunks.length;
  });

  return allChunks;
}