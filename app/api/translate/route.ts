/**
 * Translation API Route
 * Translates user-generated content using Google Cloud Translation API
 * 
 * Supports:
 * - Automatic language detection
 * - Preserves markdown formatting
 * - Rate limiting and caching headers
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

// Rate limiting: track requests per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 100; // Increased for auto-translation
const MAX_TEXT_LENGTH = 10000; // 10KB max per request

interface TranslateRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
}

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

/**
 * Extract and protect code blocks from markdown
 * Returns the text with placeholders and a map to restore them
 */
function protectCodeBlocks(text: string): { protected: string; blocks: Map<string, string> } {
  const blocks = new Map<string, string>();
  let counter = 0;
  
  // Protect fenced code blocks
  const protected1 = text.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `___CODE_BLOCK_${counter++}___`;
    blocks.set(placeholder, match);
    return placeholder;
  });
  
  // Protect inline code
  const protected2 = protected1.replace(/`[^`]+`/g, (match) => {
    const placeholder = `___INLINE_CODE_${counter++}___`;
    blocks.set(placeholder, match);
    return placeholder;
  });
  
  // Protect URLs
  const protected3 = protected2.replace(/https?:\/\/[^\s)>\]]+/g, (match) => {
    const placeholder = `___URL_${counter++}___`;
    blocks.set(placeholder, match);
    return placeholder;
  });
  
  // Protect Ethereum addresses
  const protected4 = protected3.replace(/0x[a-fA-F0-9]{40}/g, (match) => {
    const placeholder = `___ETH_ADDR_${counter++}___`;
    blocks.set(placeholder, match);
    return placeholder;
  });
  
  // Protect ENS names
  const protected5 = protected4.replace(/[a-zA-Z0-9-]+\.eth/g, (match) => {
    const placeholder = `___ENS_${counter++}___`;
    blocks.set(placeholder, match);
    return placeholder;
  });
  
  return { protected: protected5, blocks };
}

/**
 * Restore protected blocks after translation
 */
function restoreCodeBlocks(text: string, blocks: Map<string, string>): string {
  let result = text;
  blocks.forEach((original, placeholder) => {
    result = result.replace(placeholder, original);
  });
  return result;
}

export async function POST(request: NextRequest) {
  // Check for API key
  if (!GOOGLE_TRANSLATE_API_KEY) {
    return NextResponse.json(
      { error: 'Translation service not configured' },
      { status: 503 }
    );
  }
  
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const rateLimit = requestCounts.get(ip);
  
  if (rateLimit) {
    if (now < rateLimit.resetTime) {
      if (rateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      rateLimit.count++;
    } else {
      requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    }
  } else {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
  }
  
  try {
    const body: TranslateRequest = await request.json();
    const { text, targetLang, sourceLang } = body;
    
    // Validate input
    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: text and targetLang' },
        { status: 400 }
      );
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 10,000 characters.' },
        { status: 400 }
      );
    }
    
    // Protect code blocks and special content
    const { protected: protectedText, blocks } = protectCodeBlocks(text);
    
    // Call Google Translate API
    const params = new URLSearchParams({
      key: GOOGLE_TRANSLATE_API_KEY,
      q: protectedText,
      target: targetLang,
      format: 'text',
    });
    
    if (sourceLang) {
      params.append('source', sourceLang);
    }
    
    const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      console.error('Google Translate error:', await response.text());
      return NextResponse.json(
        { error: 'Translation service error' },
        { status: 502 }
      );
    }
    
    const data: GoogleTranslateResponse = await response.json();
    
    if (!data.data?.translations?.[0]) {
      return NextResponse.json(
        { error: 'Invalid translation response' },
        { status: 502 }
      );
    }
    
    const translation = data.data.translations[0];
    const translatedText = restoreCodeBlocks(translation.translatedText, blocks);
    
    return NextResponse.json({
      translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
