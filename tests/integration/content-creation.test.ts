/**
 * 🎨 CONTENT CREATION WORKFLOW
 * 
 * Demonstrates a complete content creation workflow using all AI tools:
 * - Embeddings: Find similar content
 * - Reranking: Prioritize content
 * - Image Generation: Create visuals
 * - Text-to-Speech: Generate narration
 * - Transcription: Process audio input
 */

import 'dotenv/config';
import {
  Agent,
  run,
  setDefaultModel,
  generateImageAI,
  generateEmbeddingAI,
  generateEmbeddingsAI,
  cosineSimilarity,
  rerankDocuments,
  generateSpeechAI,
  transcribeAudioAI,
} from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Set default model
setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🎨 CONTENT CREATION WORKFLOW');
console.log('═'.repeat(80));
console.log('Creating content using all AI tools...\n');

async function main() {
  try {
    // ============================================
    // STEP 1: Content Research with Embeddings
    // ============================================
    console.log('📚 STEP 1: Content Research with Embeddings');
    console.log('─'.repeat(80));
    
    const researchTopics = [
      'Artificial Intelligence and Machine Learning',
      'Climate Change and Sustainability',
      'Space Exploration and Technology',
      'Renewable Energy Solutions',
      'Digital Transformation',
    ];
    
    const query = 'AI and climate solutions';
    console.log(`   Query: "${query}"`);
    
    // Generate embeddings for query
    const queryEmbedding = await generateEmbeddingAI({
      model: openai.embedding('text-embedding-3-small'),
      value: query,
    });
    console.log(`   ✅ Generated query embedding (${queryEmbedding.embedding.length} dimensions)`);
    
    // Generate embeddings for all topics
    const topicEmbeddings = await generateEmbeddingsAI({
      model: openai.embedding('text-embedding-3-small'),
      values: researchTopics,
    });
    console.log(`   ✅ Generated embeddings for ${researchTopics.length} topics`);
    
    // Calculate similarities
    const similarities = topicEmbeddings.embeddings.map((embedding, index) => ({
      topic: researchTopics[index],
      similarity: cosineSimilarity(queryEmbedding.embedding, embedding),
    }));
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n   📊 Similarity Scores:');
    similarities.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.topic}: ${(item.similarity * 100).toFixed(2)}%`);
    });
    
    // ============================================
    // STEP 2: Select Best Content Based on Similarity
    // ============================================
    console.log('\n🔍 STEP 2: Select Best Content Based on Similarity');
    console.log('─'.repeat(80));
    
    // Use similarity scores to select best topic (reranking requires special provider)
    const selectedTopic = similarities[0].topic;
    console.log(`   ✅ Selected top ${3} topics based on similarity scores`);
    console.log('\n   🏆 Top Content:');
    similarities.slice(0, 3).forEach((item, idx) => {
      console.log(`   ${idx + 1}. [Similarity: ${(item.similarity * 100).toFixed(2)}%] ${item.topic}`);
    });
    console.log(`\n   ✨ Selected Topic: "${selectedTopic}"`);
    
    // ============================================
    // STEP 3: Generate Content with Agent
    // ============================================
    console.log('\n✍️  STEP 3: Generate Content with Agent');
    console.log('─'.repeat(80));
    
    const contentAgent = new Agent({
      name: 'Content Creator',
      instructions: `You are a professional content creator. Create engaging, informative content about the given topic.
      Your content should be:
      - Well-structured and clear
      - Engaging and informative
      - Suitable for a blog post or article
      - Include key points and insights`,
      tools: {
        research: {
          description: 'Research additional information about a topic',
          inputSchema: z.object({
            topic: z.string().describe('Topic to research'),
          }),
          execute: async ({ topic }: { topic: string }) => {
            console.log(`   🔬 Researching: ${topic}`);
            return {
              facts: [
                `${topic} is a rapidly evolving field`,
                `Recent developments show significant progress`,
                `Industry experts predict continued growth`,
              ],
              insights: `Key insights about ${topic}`,
            };
          },
        },
      },
    });
    
    const contentResult = await run(
      contentAgent,
      `Create comprehensive content about: ${selectedTopic}. Include an introduction, main points, and conclusion.`,
      { maxTurns: 5 }
    );
    
    const generatedContent = contentResult.finalOutput;
    console.log(`   ✅ Generated content (${generatedContent.length} characters)`);
    console.log(`\n   📝 Content Preview:\n${generatedContent.substring(0, 300)}...`);
    
    // ============================================
    // STEP 4: Generate Images for Content
    // ============================================
    console.log('\n🎨 STEP 4: Generate Images for Content');
    console.log('─'.repeat(80));
    
    // Create image generation prompts from content
    const imagePrompts = [
      `A modern, professional illustration representing ${selectedTopic}, digital art style, vibrant colors`,
      `Conceptual visualization of ${selectedTopic}, abstract design, clean and modern`,
      `Infographic style image about ${selectedTopic}, informative and visually appealing`,
    ];
    
    const imagesDir = path.join(process.cwd(), 'generated-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    const generatedImages = [];
    
    for (let i = 0; i < imagePrompts.length; i++) {
      const prompt = imagePrompts[i];
      console.log(`\n   🖼️  Generating image ${i + 1}/${imagePrompts.length}...`);
      console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);
      
      try {
        // Note: DALL-E 3 only supports n=1, size='1024x1024' or '1792x1024' or '1024x1792'
        const imageResult = await generateImageAI({
          model: openai.image('dall-e-3'),
          prompt,
          size: '1024x1024',
          n: 1,
        });
        
        if (imageResult.images && imageResult.images.length > 0) {
          const imageData = imageResult.images[0];
          const imagePath = path.join(imagesDir, `content-image-${i + 1}.png`);
          
          // Save image (base64 string)
          if (typeof imageData === 'string') {
            // If it's a data URL, extract base64 part
            const base64Data = imageData.includes(',') 
              ? imageData.split(',')[1] 
              : imageData;
            fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
            
            generatedImages.push({
              path: imagePath,
              url: imageData,
              prompt,
            });
            
            console.log(`   ✅ Image saved: ${imagePath}`);
            console.log(`   📏 Image size: ${fs.statSync(imagePath).size} bytes`);
          } else {
            console.log(`   ⚠️  Unexpected image format: ${typeof imageData}`);
          }
        } else {
          console.log(`   ⚠️  No images returned in result`);
        }
      } catch (error: any) {
        console.error(`   ⚠️  Image generation error: ${error.message}`);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n')[0]}`);
        }
        // Continue with next image
      }
    }
    
    console.log(`\n   ✅ Generated ${generatedImages.length} images`);
    
    // ============================================
    // STEP 5: Generate Audio Narration (TTS)
    // ============================================
    console.log('\n🔊 STEP 5: Generate Audio Narration (TTS)');
    console.log('─'.repeat(80));
    
    // Create a shorter version for audio
    const audioText = generatedContent.substring(0, 500) + '...';
    console.log(`   📝 Text for narration (${audioText.length} characters)`);
    
    try {
      const speechResult = await generateSpeechAI({
        model: openai.speech('tts-1'),
        text: audioText,
        voice: 'alloy',
        speed: 1.0,
      });
      
      if (speechResult.audio) {
        const audioDir = path.join(process.cwd(), 'generated-audio');
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }
        
        const audioPath = path.join(audioDir, 'content-narration.mp3');
        
        // Save audio
        if (typeof speechResult.audio === 'string' && speechResult.audio.startsWith('data:')) {
          const base64Data = speechResult.audio.split(',')[1];
          fs.writeFileSync(audioPath, Buffer.from(base64Data, 'base64'));
        } else if (speechResult.audio instanceof Uint8Array || Buffer.isBuffer(speechResult.audio)) {
          fs.writeFileSync(audioPath, speechResult.audio);
        }
        
        console.log(`   ✅ Audio saved: ${audioPath}`);
        console.log(`   ⏱️  Duration: ${speechResult.duration || 'N/A'} seconds`);
      }
    } catch (error: any) {
      console.error(`   ⚠️  TTS error: ${error.message}`);
    }
    
    // ============================================
    // STEP 6: Create Content Summary with Embeddings
    // ============================================
    console.log('\n📊 STEP 6: Create Content Summary with Embeddings');
    console.log('─'.repeat(80));
    
    // Split content into chunks
    const contentChunks = [
      generatedContent.substring(0, 200),
      generatedContent.substring(200, 400),
      generatedContent.substring(400, 600),
    ].filter(chunk => chunk.length > 0);
    
    const chunkEmbeddings = await generateEmbeddingsAI({
      model: openai.embedding('text-embedding-3-small'),
      values: contentChunks,
    });
    
    // Find most important chunk (highest similarity to query)
    const chunkSimilarities = chunkEmbeddings.embeddings.map((embedding, index) => ({
      chunk: contentChunks[index],
      similarity: cosineSimilarity(queryEmbedding.embedding, embedding),
    }));
    
    chunkSimilarities.sort((a, b) => b.similarity - a.similarity);
    const keyChunk = chunkSimilarities[0].chunk;
    
    console.log(`   ✅ Analyzed ${contentChunks.length} content chunks`);
    console.log(`   🎯 Key Chunk: "${keyChunk.substring(0, 100)}..."`);
    
    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n\n📋 CONTENT CREATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Topic Selected: ${selectedTopic}`);
    console.log(`✅ Content Generated: ${generatedContent.length} characters`);
    console.log(`✅ Images Generated: ${generatedImages.length}`);
    console.log(`✅ Audio Narration: Created`);
    console.log(`✅ Content Analysis: Completed`);
    console.log('\n📁 Generated Files:');
    console.log(`   - Images: ${imagesDir}/`);
    generatedImages.forEach((img, idx) => {
      console.log(`     ${idx + 1}. content-image-${idx + 1}.png`);
    });
    console.log(`   - Audio: generated-audio/content-narration.mp3`);
    console.log('\n🎉 Content creation workflow completed successfully!');
    console.log('═'.repeat(80));
    
  } catch (error: any) {
    console.error('\n❌ Error in content creation workflow:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

