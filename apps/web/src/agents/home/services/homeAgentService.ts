/**
 * Home Agent Service - API Communication
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Handles communication with Supabase edge functions for:
 * - Voice-to-text (transcription)
 * - AI response generation
 * - Text-to-speech
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface AIResponse {
  success: boolean;
  text?: string;
  audioUrl?: string;
  error?: string;
}

export interface ConversationContext {
  deviceId: string;
  sessionId: string;
  agentName: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Transcribe audio to text
 */
export async function transcribeAudio(
  audioBase64: string,
  context: ConversationContext
): Promise<TranscriptionResult> {
  try {
    const voiceApiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${voiceApiUrl}/functions/v1/voice-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        mimeType: 'audio/webm',
        language: 'pt',
        includeWordTimestamps: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[HomeAgentService] Transcription error:', errorData);
      return { success: false, error: errorData.error || `Transcription failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      text: data?.text || '',
    };
  } catch (err) {
    console.error('[HomeAgentService] Transcription failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transcription failed',
    };
  }
}

/**
 * Get AI response for user message
 */
export async function getAIResponse(
  userMessage: string,
  context: ConversationContext
): Promise<AIResponse> {
  try {
    // Format history for edge function
    const history = (context.messages || []).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const { data, error } = await supabase.functions.invoke('pwa-home-agent', {
      body: {
        prompt: userMessage,
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        history,
      },
    });

    if (error) {
      console.error('[HomeAgentService] AI response error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      text: data?.response || data?.text || '',
      audioUrl: data?.audioUrl,
    };
  } catch (err) {
    console.error('[HomeAgentService] AI response failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'AI response failed',
    };
  }
}

/**
 * Convert text to speech
 *
 * NOTE: The text-to-speech edge function returns raw audio bytes (audio/mpeg),
 * NOT JSON. We need to handle this binary response correctly.
 */
export async function textToSpeech(
  text: string,
  options?: {
    voice?: string;
    rate?: number;
  }
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    console.log('[HomeAgentService] TTS request:', { textLength: text.length, voice: options?.voice });

    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: {
        text,
        voice: options?.voice || 'nova',
        speed: options?.rate || 1.0,
        chatType: 'home', // For voice configuration
      },
    });

    if (error) {
      console.error('[HomeAgentService] TTS error:', error);
      return { success: false, error: error.message };
    }

    // The edge function returns raw audio bytes, not JSON
    // Supabase functions.invoke returns this as ArrayBuffer or Blob

    // Case 1: data is already a Blob
    if (data instanceof Blob) {
      console.log('[HomeAgentService] TTS received Blob:', data.size, 'bytes');
      const audioUrl = URL.createObjectURL(data);
      return { success: true, audioUrl };
    }

    // Case 2: data is an ArrayBuffer
    if (data instanceof ArrayBuffer) {
      console.log('[HomeAgentService] TTS received ArrayBuffer:', data.byteLength, 'bytes');
      const audioBlob = new Blob([data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    }

    // Case 3: data has a raw array (Uint8Array-like structure from JSON)
    if (data && typeof data === 'object' && 'length' in data) {
      console.log('[HomeAgentService] TTS received array-like:', data.length, 'bytes');
      const audioBlob = new Blob([new Uint8Array(data)], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    }

    // Case 4: JSON response with audioUrl (legacy support)
    if (data?.audioUrl) {
      console.log('[HomeAgentService] TTS received audioUrl');
      return { success: true, audioUrl: data.audioUrl };
    }

    // Case 5: JSON response with base64 audio (legacy support)
    if (data?.audio) {
      console.log('[HomeAgentService] TTS received base64 audio');
      const audioBlob = base64ToBlob(data.audio, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    }

    // If none of the above, log what we received for debugging
    console.error('[HomeAgentService] TTS unexpected response type:', {
      type: typeof data,
      constructor: data?.constructor?.name,
      keys: data ? Object.keys(data).slice(0, 5) : null,
    });

    return { success: false, error: 'Unexpected audio response format' };
  } catch (err) {
    console.error('[HomeAgentService] TTS failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'TTS failed',
    };
  }
}

/**
 * Process voice input end-to-end:
 * 1. Transcribe audio
 * 2. Get AI response
 * 3. Convert to speech
 */
export async function processVoiceInput(
  audioBase64: string,
  context: ConversationContext
): Promise<{
  success: boolean;
  userText?: string;
  assistantText?: string;
  audioUrl?: string;
  error?: string;
}> {
  // Step 1: Transcribe
  const transcription = await transcribeAudio(audioBase64, context);
  if (!transcription.success || !transcription.text) {
    return {
      success: false,
      error: transcription.error || 'Failed to transcribe audio',
    };
  }

  // Step 2: Get AI response
  const contextWithHistory: ConversationContext = {
    ...context,
    messages: [
      ...(context.messages || []),
      { role: 'user', content: transcription.text },
    ],
  };

  const aiResponse = await getAIResponse(transcription.text, contextWithHistory);
  if (!aiResponse.success || !aiResponse.text) {
    return {
      success: false,
      userText: transcription.text,
      error: aiResponse.error || 'Failed to get AI response',
    };
  }

  // Step 3: Convert to speech (if no audio URL provided)
  let audioUrl = aiResponse.audioUrl;
  if (!audioUrl && aiResponse.text) {
    const ttsResult = await textToSpeech(aiResponse.text);
    if (ttsResult.success) {
      audioUrl = ttsResult.audioUrl;
    }
  }

  return {
    success: true,
    userText: transcription.text,
    assistantText: aiResponse.text,
    audioUrl,
  };
}

// Helper function
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default {
  transcribeAudio,
  getAIResponse,
  textToSpeech,
  processVoiceInput,
};
