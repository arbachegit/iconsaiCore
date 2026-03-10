/**
 * ============================================================
 * useVoiceAssistant Hook - v3.2.0
 * ============================================================
 * Hook principal para orquestrar o assistente de voz
 * - Máquina de estados criteriosa
 * - Transcrição com Whisper (mais preciso)
 * - LLM: Perplexity → Gemini → ChatGPT
 * - TTS com Nova
 *
 * v3.0.0: Suporte a Karaoke TTS
 * - Word timestamps para sincronização palavra-por-palavra
 * - Expõe audioElement para sync externo
 * ============================================================
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
// Note: Using Python backend directly via fetch (NEXT_PUBLIC_VOICE_API_URL)
import { VoicePlayer } from '@/core/services/VoiceService/VoicePlayer';
import { VoiceRecorder } from '@/core/services/VoiceService/VoiceRecorder';
import {
  VoiceButtonState,
  VoiceAssistantState,
  VoiceAssistantConfig,
  ChatMessage,
  WordTiming,
  VALID_TRANSITIONS,
  DEFAULT_CONFIG,
} from '@/components/voice-assistant/types';

// Gerar ID único para mensagens
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useVoiceAssistant(config: Partial<VoiceAssistantConfig> = {}) {
  // Extrair valores individuais para dependências estáveis
  const welcomeMessage = config?.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage;
  const voice = config?.voice ?? DEFAULT_CONFIG.voice;
  const speed = config?.speed ?? DEFAULT_CONFIG.speed;
  const maxRecordingDuration = config?.maxRecordingDuration ?? DEFAULT_CONFIG.maxRecordingDuration;

  const finalConfig = useMemo(
    () => ({ welcomeMessage, voice, speed, maxRecordingDuration }),
    [welcomeMessage, voice, speed, maxRecordingDuration]
  );

  // State
  const [state, setState] = useState<VoiceAssistantState>({
    buttonState: 'idle',
    messages: [],
    frequencyData: [],
    frequencySource: 'none',
    error: null,
    isInitialized: false,
  });

  // Refs para serviços
  const playerRef = useRef<VoicePlayer | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentStateRef = useRef<VoiceButtonState>('idle');

  // Manter ref sincronizada com state
  useEffect(() => {
    currentStateRef.current = state.buttonState;
  }, [state.buttonState]);

  // ============================================================
  // MÁQUINA DE ESTADOS - Transição segura
  // ============================================================
  const transitionTo = useCallback((newState: VoiceButtonState) => {
    const currentState = currentStateRef.current;
    const validTransitions = VALID_TRANSITIONS[currentState];

    if (!validTransitions.includes(newState)) {
      console.warn(
        `[VoiceAssistant] Invalid transition: ${currentState} → ${newState}. Valid: ${validTransitions.join(', ')}`
      );
      return false;
    }

    console.log(`[VoiceAssistant] State: ${currentState} → ${newState}`);
    currentStateRef.current = newState;
    setState((prev) => ({ ...prev, buttonState: newState, error: null }));
    return true;
  }, []);

  // Reset para idle (força transição)
  const forceReset = useCallback(() => {
    console.log('[VoiceAssistant] Force reset to idle');
    currentStateRef.current = 'idle';
    setState((prev) => ({
      ...prev,
      buttonState: 'idle',
      frequencyData: [],
      frequencySource: 'none',
      error: null,
    }));

    // Limpar recursos
    playerRef.current?.stop();
    recorderRef.current?.cancel();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  const initialize = useCallback(() => {
    if (state.isInitialized) return;

    // Criar player e recorder
    playerRef.current = new VoicePlayer();
    recorderRef.current = new VoiceRecorder();

    // Configurar callbacks do player
    playerRef.current.setCallbacks({
      onEnded: () => {
        console.log('[VoiceAssistant] Audio ended');
        stopFrequencyAnalysis();

        // Se estava no greeting, vai para ready
        // Se estava no speaking, vai para ready
        if (currentStateRef.current === 'greeting' || currentStateRef.current === 'speaking') {
          transitionTo('ready');
        }
      },
      onFrequencyData: (data) => {
        setState((prev) => ({
          ...prev,
          frequencyData: data,
          frequencySource: 'robot',
        }));
      },
      onError: (err) => {
        console.error('[VoiceAssistant] Player error:', err);
        setState((prev) => ({ ...prev, error: err.message }));
        forceReset();
      },
    });

    // Configurar callbacks do recorder
    recorderRef.current.setCallbacks({
      onFrequencyData: (data) => {
        if (currentStateRef.current === 'recording') {
          setState((prev) => ({
            ...prev,
            frequencyData: data,
            frequencySource: 'user',
          }));
        }
      },
      onError: (err) => {
        console.error('[VoiceAssistant] Recorder error:', err);
        setState((prev) => ({ ...prev, error: err.message }));
        forceReset();
      },
    });

    setState((prev) => ({ ...prev, isInitialized: true }));
    console.log('[VoiceAssistant] Initialized');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isInitialized, transitionTo, forceReset]);

  // ============================================================
  // ANÁLISE DE FREQUÊNCIA
  // ============================================================
  const startFrequencyAnalysis = useCallback((source: 'robot' | 'user') => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const analyze = () => {
      let data: number[] = [];

      if (source === 'robot' && playerRef.current) {
        data = playerRef.current.getFrequencyData();
      } else if (source === 'user' && recorderRef.current) {
        data = recorderRef.current.getFrequencyData();
      }

      setState((prev) => ({
        ...prev,
        frequencyData: data,
        frequencySource: data.length > 0 ? source : 'none',
      }));

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, []);

  const stopFrequencyAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      frequencyData: [],
      frequencySource: 'none',
    }));
  }, []);

  // ============================================================
  // ADICIONAR MENSAGEM AO CHAT
  // ============================================================
  const addMessage = useCallback(
    (
      role: 'user' | 'assistant',
      content: string,
      options?: { audioUrl?: string; words?: WordTiming[]; duration?: number }
    ) => {
      const message: ChatMessage = {
        id: generateId(),
        role,
        content,
        timestamp: new Date(),
        audioUrl: options?.audioUrl,
        words: options?.words,
        duration: options?.duration,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));

      return message;
    },
    []
  );

  // ============================================================
  // v3.0.0: ATUALIZAR ÚLTIMA MENSAGEM (para adicionar words após TTS)
  // ============================================================
  const updateLastMessage = useCallback(
    (updates: Partial<Pick<ChatMessage, 'words' | 'duration' | 'audioUrl'>>) => {
      setState((prev) => {
        const messages = [...prev.messages];
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          messages[messages.length - 1] = { ...lastMessage, ...updates };
        }
        return { ...prev, messages };
      });
    },
    []
  );

  // ============================================================
  // v3.0.0: Expor audioElement para sync externo
  // ============================================================
  const getAudioElement = useCallback((): HTMLAudioElement | null => {
    return playerRef.current?.getAudioElement() || null;
  }, []);

  // ============================================================
  // PLAY WELCOME (Estado: idle → greeting → ready)
  // v3.0.0: Usa Karaoke TTS para word timestamps
  // v3.1.0: Busca words ANTES de tocar para sync correto
  // ============================================================
  const playWelcome = useCallback(async () => {
    if (currentStateRef.current !== 'idle') {
      console.warn('[VoiceAssistant] Cannot play welcome, state is:', currentStateRef.current);
      return;
    }

    // Warmup audio (crítico para Safari/iOS)
    playerRef.current?.warmup();

    if (!transitionTo('greeting')) return;

    try {
      // 1. Buscar TTS com Karaoke PRIMEIRO (sem tocar ainda)
      console.log('[VoiceAssistant] v3.2.0 - Fetching ElevenLabs karaoke TTS for welcome...');
      const karaokeResult = await playerRef.current?.fetchKaraokeTTS(
        finalConfig.welcomeMessage,
        'home',
        finalConfig.voice
      );

      // 2. Adicionar mensagem JÁ com words (antes de tocar)
      addMessage('assistant', finalConfig.welcomeMessage, {
        words: karaokeResult?.words,
        duration: karaokeResult?.duration || undefined,
        audioUrl: karaokeResult?.audioUrl,
      });

      console.log('[VoiceAssistant] Message added with', karaokeResult?.words?.length || 0, 'words');

      // 3. Agora tocar o áudio (words já disponíveis para sync)
      startFrequencyAnalysis('robot');
      if (karaokeResult?.audioUrl) {
        await playerRef.current?.play(karaokeResult.audioUrl);
      }

      // onEnded callback vai transicionar para 'ready'
    } catch (err) {
      console.error('[VoiceAssistant] Welcome failed:', err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao reproduzir boas-vindas',
      }));
      forceReset();
    }
  }, [transitionTo, addMessage, startFrequencyAnalysis, forceReset, finalConfig]);

  // ============================================================
  // START RECORDING (Estado: ready → recording)
  // ============================================================
  const startRecording = useCallback(async () => {
    if (currentStateRef.current !== 'ready') {
      console.warn('[VoiceAssistant] Cannot start recording, state is:', currentStateRef.current);
      return;
    }

    if (!transitionTo('recording')) return;

    try {
      await recorderRef.current?.start();
      startFrequencyAnalysis('user');
    } catch (err) {
      console.error('[VoiceAssistant] Start recording failed:', err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao iniciar gravação',
      }));
      // Voltar para ready
      currentStateRef.current = 'ready';
      setState((prev) => ({ ...prev, buttonState: 'ready' }));
    }
  }, [transitionTo, startFrequencyAnalysis]);

  // ============================================================
  // STOP RECORDING E PROCESSAR (Estado: recording → processing → speaking → ready)
  // v3.0.0: Usa word timestamps na transcrição e Karaoke TTS na resposta
  // ============================================================
  const stopRecordingAndProcess = useCallback(async () => {
    if (currentStateRef.current !== 'recording') {
      console.warn('[VoiceAssistant] Cannot stop recording, state is:', currentStateRef.current);
      return;
    }

    stopFrequencyAnalysis();
    if (!transitionTo('processing')) return;

    try {
      // 1. Parar gravação e obter áudio
      const recordingResult = await recorderRef.current?.stop();
      if (!recordingResult?.base64) {
        throw new Error('Gravação vazia');
      }

      // 2. Transcrever com Whisper + word timestamps (Python Backend)
      const voiceApiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

      console.log('[VoiceAssistant] v3.2.0 - Recording stopped, processing with Whisper...', {
        apiUrl: voiceApiUrl,
        hasVoiceApiUrl: !!process.env.NEXT_PUBLIC_VOICE_API_URL,
      });

      const transcriptionResponse = await fetch(`${voiceApiUrl}/functions/v1/voice-to-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: recordingResult.base64,
          mimeType: recordingResult.mimeType,
          language: 'pt',
          includeWordTimestamps: true,
        }),
      });

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.json().catch(() => ({}));
        throw new Error(errorData.detail?.error || errorData.error || 'Erro na transcrição');
      }

      const transcriptionData = await transcriptionResponse.json();
      const userText = transcriptionData?.text;
      if (!userText || userText.trim() === '') {
        throw new Error('Não foi possível entender o áudio');
      }

      console.log('[VoiceAssistant] Transcribed:', userText.substring(0, 50));
      console.log('[VoiceAssistant] Words received:', transcriptionData?.words?.length || 0);

      // Adicionar mensagem do usuário com word timestamps
      addMessage('user', userText, {
        words: transcriptionData?.words,
        duration: transcriptionData?.duration,
      });

      // 3. Chamar chat-router (Python Backend)
      const chatResponse = await fetch(`${voiceApiUrl}/functions/v1/chat-router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pwaMode: true,
          message: userText,
          agentSlug: 'home',
          deviceId: `voice-assistant-${Date.now()}`,
        }),
      });

      if (!chatResponse.ok) {
        const chatError = await chatResponse.json().catch(() => ({}));
        throw new Error(chatError.error || 'Erro ao processar resposta');
      }

      const chatData = await chatResponse.json();
      const assistantText = chatData?.response;
      if (!assistantText) {
        throw new Error('Resposta vazia do assistente');
      }

      console.log('[VoiceAssistant] Response:', assistantText.substring(0, 50));

      // 4. Transicionar para speaking e reproduzir TTS com Karaoke
      if (!transitionTo('speaking')) return;

      // 4a. Buscar TTS com Karaoke PRIMEIRO (sem tocar ainda)
      console.log('[VoiceAssistant] Fetching karaoke TTS for response...');
      const karaokeResult = await playerRef.current?.fetchKaraokeTTS(
        assistantText,
        'home',
        finalConfig.voice
      );

      // 4b. Adicionar mensagem JÁ com words (antes de tocar)
      addMessage('assistant', assistantText, {
        words: karaokeResult?.words,
        duration: karaokeResult?.duration || undefined,
        audioUrl: karaokeResult?.audioUrl,
      });

      console.log('[VoiceAssistant] Response message added with', karaokeResult?.words?.length || 0, 'words');

      // 4c. Agora tocar o áudio (words já disponíveis para sync)
      startFrequencyAnalysis('robot');
      if (karaokeResult?.audioUrl) {
        await playerRef.current?.play(karaokeResult.audioUrl);
      }

      // onEnded callback vai transicionar para 'ready'
    } catch (err) {
      console.error('[VoiceAssistant] Processing failed:', err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao processar',
      }));

      // Tentar voltar para ready
      stopFrequencyAnalysis();
      currentStateRef.current = 'ready';
      setState((prev) => ({ ...prev, buttonState: 'ready' }));
    }
  }, [transitionTo, stopFrequencyAnalysis, addMessage, startFrequencyAnalysis, finalConfig]);

  // ============================================================
  // HANDLER PRINCIPAL DO BOTÃO
  // ============================================================
  const handleButtonClick = useCallback(() => {
    const currentState = currentStateRef.current;

    switch (currentState) {
      case 'idle':
        playWelcome();
        break;

      case 'ready':
        startRecording();
        break;

      case 'recording':
        stopRecordingAndProcess();
        break;

      case 'greeting':
      case 'processing':
      case 'speaking':
        // Não fazer nada durante esses estados
        console.log('[VoiceAssistant] Button click ignored in state:', currentState);
        break;

      default:
        console.warn('[VoiceAssistant] Unknown state:', currentState);
    }
  }, [playWelcome, startRecording, stopRecordingAndProcess]);

  // ============================================================
  // CLEANUP
  // ============================================================
  useEffect(() => {
    return () => {
      console.log('[VoiceAssistant] Cleanup');
      playerRef.current?.destroy();
      recorderRef.current?.destroy();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    // State
    buttonState: state.buttonState,
    messages: state.messages,
    frequencyData: state.frequencyData,
    frequencySource: state.frequencySource,
    error: state.error,
    isInitialized: state.isInitialized,

    // Actions
    initialize,
    handleButtonClick,
    forceReset,

    // v3.0.0: Karaoke support
    getAudioElement,
  };
}

export default useVoiceAssistant;
// Force deploy 1770152076
