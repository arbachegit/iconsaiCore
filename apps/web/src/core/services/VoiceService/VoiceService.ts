/**
 * VoiceService - Main Voice Orchestrator
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Orchestrates VoicePlayer + VoiceRecorder + API calls.
 * Key feature: Explicit user control (no automatic transitions).
 *
 * State flow:
 * idle -> [playWelcome] -> playing -> [audio ends] -> ready
 * ready -> [startRecording] -> recording -> [stopRecording] -> processing
 * processing -> [response ready] -> playing -> [audio ends] -> ready
 *
 * User controls when to transition from 'ready' to 'recording'!
 */

import { supabase } from '@/integrations/supabase/client';
import { VoicePlayer } from './VoicePlayer';
import { VoiceRecorder } from './VoiceRecorder';
import type {
  VoiceServiceState,
  VoiceServiceCallbacks,
  VoiceServiceConfig,
  VoiceApiContext,
  VoiceProcessingResult,
} from './types';

export class VoiceService {
  private state: VoiceServiceState = 'idle';
  private player: VoicePlayer;
  private recorder: VoiceRecorder;
  private config: VoiceServiceConfig;
  private callbacks: VoiceServiceCallbacks = {};
  private recordingTimeout: NodeJS.Timeout | null = null;
  private context: VoiceApiContext | null = null;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private hasPlayedWelcome = false;

  constructor(config: VoiceServiceConfig) {
    this.config = {
      maxRecordingDuration: 60000,
      voice: 'nova',
      speed: 1.0,
      ...config,
    };

    this.player = new VoicePlayer();
    this.recorder = new VoiceRecorder();

    this.setupPlayerCallbacks();
    this.setupRecorderCallbacks();
  }

  /**
   * Set context for API calls (deviceId, sessionId)
   */
  setContext(context: VoiceApiContext): void {
    this.context = context;
  }

  /**
   * Set callbacks for service events
   */
  setCallbacks(callbacks: VoiceServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current state
   */
  getState(): VoiceServiceState {
    return this.state;
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): number[] {
    if (this.state === 'playing') {
      return this.player.getFrequencyData();
    }
    if (this.state === 'recording') {
      return this.recorder.getFrequencyData();
    }
    return [];
  }

  /**
   * Warmup audio - call in user gesture context
   */
  warmup(): void {
    this.player.warmup();
  }

  /**
   * Play welcome message (TTS)
   * idle -> playing -> ready
   */
  async playWelcome(): Promise<void> {
    if (this.state !== 'idle') {
      console.warn('[VoiceService] Cannot play welcome, state is:', this.state);
      return;
    }

    if (!this.config.welcomeMessage) {
      console.log('[VoiceService] No welcome message, going to ready');
      this.setState('ready');
      return;
    }

    try {
      // Warmup audio before playing (critical for iOS/Safari)
      this.player.warmup();

      this.setState('playing');
      console.log('[VoiceService] v3.2.0 - Playing welcome with ElevenLabs karaoke...');

      // Use ElevenLabs karaoke TTS (only TTS method available)
      const result = await this.player.fetchKaraokeTTS(
        this.config.welcomeMessage,
        'home',
        this.config.voice || 'nova'
      );
      await this.player.play(result.audioUrl);
      this.hasPlayedWelcome = true;
    } catch (err) {
      console.error('[VoiceService] Welcome failed:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Welcome failed'));
      this.setState('ready'); // Go to ready even on error
    }
  }

  /**
   * Play audio from URL
   * Used for responses
   */
  async playAudio(audioUrl: string): Promise<void> {
    try {
      this.setState('playing');
      await this.player.play(audioUrl);
    } catch (err) {
      console.error('[VoiceService] Play failed:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Play failed'));
      this.setState('ready');
    }
  }

  /**
   * Start recording
   * ready -> recording
   */
  async startRecording(): Promise<void> {
    if (this.state !== 'ready' && this.state !== 'idle') {
      console.warn('[VoiceService] Cannot start recording, state is:', this.state);
      return;
    }

    try {
      this.setState('recording');
      await this.recorder.start();

      // Set timeout
      this.recordingTimeout = setTimeout(() => {
        this.stopRecording();
      }, this.config.maxRecordingDuration!);
    } catch (err) {
      console.error('[VoiceService] Recording failed:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Recording failed'));
      this.setState('ready');
    }
  }

  /**
   * Stop recording and process
   * recording -> processing -> playing -> ready
   */
  async stopRecording(): Promise<void> {
    if (this.state !== 'recording') {
      console.warn('[VoiceService] Cannot stop recording, state is:', this.state);
      return;
    }

    // Clear timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    this.setState('processing');

    try {
      const result = await this.recorder.stop();
      if (!result) {
        throw new Error('Recording returned no data');
      }

      // Process the audio
      await this.processAudio(result.base64);
    } catch (err) {
      console.error('[VoiceService] Stop recording failed:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Processing failed'));
      this.setState('ready');
    }
  }

  /**
   * Stop everything and reset
   */
  stop(): void {
    // Clear recording timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    // Stop player and recorder
    this.player.stop();
    this.recorder.cancel();

    this.setState('idle');
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.stop();
    this.conversationHistory = [];
    this.hasPlayedWelcome = false;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.player.destroy();
    this.recorder.destroy();
    this.callbacks = {};
  }

  // Private methods

  private setState(newState: VoiceServiceState): void {
    const oldState = this.state;
    this.state = newState;
    console.log(`[VoiceService] State: ${oldState} -> ${newState}`);
    this.callbacks.onStateChange?.(newState);
  }

  private setupPlayerCallbacks(): void {
    this.player.setCallbacks({
      onEnded: () => {
        // When audio ends, go to ready state (user decides when to record)
        if (this.state === 'playing') {
          this.setState('ready');
        }
      },
      onProgress: (progress) => {
        this.callbacks.onPlaybackProgress?.(progress);
      },
      onFrequencyData: (data) => {
        if (this.state === 'playing') {
          this.callbacks.onFrequencyData?.(data);
        }
      },
      onError: (err) => {
        this.callbacks.onError?.(err);
        this.setState('ready');
      },
    });
  }

  private setupRecorderCallbacks(): void {
    this.recorder.setCallbacks({
      onFrequencyData: (data) => {
        if (this.state === 'recording') {
          this.callbacks.onFrequencyData?.(data);
        }
      },
      onDuration: (seconds) => {
        this.callbacks.onRecordingDuration?.(seconds);
      },
      onError: (err) => {
        this.callbacks.onError?.(err);
        this.setState('ready');
      },
    });
  }

  private async processAudio(audioBase64: string): Promise<void> {
    if (!this.context) {
      throw new Error('No context set');
    }

    const result = await this.processVoiceInput(audioBase64);

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Add to conversation history
    if (result.userText) {
      this.conversationHistory.push({ role: 'user', content: result.userText });
      this.callbacks.onTranscription?.(result.userText);
    }

    if (result.assistantText) {
      this.conversationHistory.push({ role: 'assistant', content: result.assistantText });
      this.callbacks.onResponse?.(result.assistantText, result.audioUrl);
    }

    // Play response audio
    if (result.audioUrl) {
      this.setState('playing');
      await this.player.play(result.audioUrl);
    } else {
      this.setState('ready');
    }
  }

  private async processVoiceInput(audioBase64: string): Promise<VoiceProcessingResult> {
    // Step 1: Transcribe
    const transcription = await this.transcribeAudio(audioBase64);
    if (!transcription.success || !transcription.text) {
      return {
        success: false,
        error: transcription.error || 'Failed to transcribe audio',
      };
    }

    // Step 2: Get AI response
    const aiResponse = await this.getAIResponse(transcription.text);
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
      const ttsResult = await this.textToSpeech(aiResponse.text);
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

  private async transcribeAudio(audioBase64: string): Promise<{ success: boolean; text?: string; words?: Array<{ word: string; start: number; end: number }>; error?: string }> {
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
        return { success: false, error: errorData.error || `Transcription failed: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        text: data?.text || '',
        words: data?.words,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Transcription failed',
      };
    }
  }

  private async getAIResponse(userMessage: string): Promise<{ success: boolean; text?: string; audioUrl?: string; error?: string }> {
    try {
      const history = [
        ...this.conversationHistory,
        { role: 'user' as const, content: userMessage },
      ];

      const { data, error } = await supabase.functions.invoke('pwa-home-agent', {
        body: {
          prompt: userMessage,
          deviceId: this.context!.deviceId,
          sessionId: this.context!.sessionId,
          history,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        text: data?.response || data?.text || '',
        audioUrl: data?.audioUrl,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AI response failed',
      };
    }
  }

  private async textToSpeech(text: string): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      console.log('[VoiceService] v3.2.0 - Using ElevenLabs karaoke TTS...');

      // Use ElevenLabs karaoke TTS (only TTS method available)
      const result = await this.player.fetchKaraokeTTS(
        text,
        'home',
        this.config.voice || 'nova'
      );

      return { success: true, audioUrl: result.audioUrl };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'TTS failed',
      };
    }
  }

}

export default VoiceService;
