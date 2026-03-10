/**
 * ============================================================
 * useRealtimeSTT Hook - v1.0.0
 * ============================================================
 * Hook para transcrição de fala em tempo real via WebSocket.
 *
 * Features:
 * - Conecta ao backend Python via WebSocket
 * - Envia chunks de áudio em tempo real
 * - Recebe transcrições parciais e finais
 * - Word-level timestamps para karaoke sync
 * - Auto-reconnect em caso de desconexão
 *
 * Uso:
 * ```tsx
 * const { connect, disconnect, sendAudio, transcription, words, isConnected } = useRealtimeSTT();
 *
 * // Conectar ao iniciar gravação
 * await connect();
 *
 * // Enviar chunks de áudio conforme são gravados
 * mediaRecorder.ondataavailable = (e) => sendAudio(e.data);
 *
 * // Exibir transcrição parcial em tempo real
 * <KaraokeText words={words} ... />
 * ```
 * ============================================================
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionEvent {
  status: 'listening' | 'speech_start' | 'partial' | 'final' | 'end' | 'error' | 'configured';
  text?: string;
  words?: WordTiming[];
  confidence?: number;
  timestamp?: number;
  error?: string;
  sessionId?: string;
  stats?: {
    duration: number;
    totalAudioBytes: number;
    totalTranscriptions: number;
  };
}

export interface UseRealtimeSTTOptions {
  /** URL do backend (default: NEXT_PUBLIC_VOICE_API_URL) */
  backendUrl?: string;
  /** Idioma (default: pt) */
  language?: string;
  /** Sample rate do áudio (default: 16000) */
  sampleRate?: number;
  /** Formato do áudio (default: webm) */
  audioFormat?: 'webm' | 'opus' | 'pcm';
  /** Callback para cada evento de transcrição */
  onTranscription?: (event: TranscriptionEvent) => void;
  /** Callback quando conexão estabelecida */
  onConnect?: () => void;
  /** Callback quando desconectado */
  onDisconnect?: () => void;
  /** Callback em caso de erro */
  onError?: (error: string) => void;
  /** Auto-reconnect em caso de desconexão (default: true) */
  autoReconnect?: boolean;
}

export interface UseRealtimeSTTReturn {
  /** Conectar ao WebSocket */
  connect: () => Promise<boolean>;
  /** Desconectar do WebSocket */
  disconnect: () => void;
  /** Enviar chunk de áudio */
  sendAudio: (audioData: Blob | ArrayBuffer) => void;
  /** Transcrição atual (parcial ou final) */
  transcription: string;
  /** Words com timestamps para karaoke */
  words: WordTiming[];
  /** Status da conexão */
  isConnected: boolean;
  /** Está transcrevendo (detectou fala) */
  isTranscribing: boolean;
  /** Último erro */
  error: string | null;
  /** ID da sessão atual */
  sessionId: string | null;
}

export function useRealtimeSTT(options: UseRealtimeSTTOptions = {}): UseRealtimeSTTReturn {
  const {
    backendUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    language = 'pt',
    sampleRate = 16000,
    audioFormat = 'webm',
    onTranscription,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [words, setWords] = useState<WordTiming[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Construir URL do WebSocket
   */
  const getWebSocketUrl = useCallback((): string => {
    // Converter HTTP(S) para WS(S)
    let wsUrl = backendUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');

    // Adicionar path do endpoint
    if (!wsUrl.endsWith('/')) {
      wsUrl += '/';
    }
    wsUrl += 'functions/v1/realtime-stt';

    return wsUrl;
  }, [backendUrl]);

  /**
   * Processar evento recebido do WebSocket
   */
  const handleEvent = useCallback((event: TranscriptionEvent) => {
    console.log('[RealtimeSTT] Event:', event.status, event.text?.substring(0, 30));

    switch (event.status) {
      case 'listening':
        setIsTranscribing(false);
        break;

      case 'speech_start':
        setIsTranscribing(true);
        break;

      case 'partial':
        if (event.text) {
          setTranscription(event.text);
        }
        if (event.words) {
          setWords(event.words);
        }
        break;

      case 'final':
        if (event.text) {
          setTranscription(event.text);
        }
        if (event.words) {
          setWords(event.words);
        }
        setIsTranscribing(false);
        break;

      case 'configured':
        console.log('[RealtimeSTT] Configuration accepted');
        break;

      case 'end':
        if (event.sessionId) {
          console.log('[RealtimeSTT] Session ended:', event.stats);
        }
        break;

      case 'error':
        setError(event.error || 'Unknown error');
        onError?.(event.error || 'Unknown error');
        break;
    }

    onTranscription?.(event);
  }, [onTranscription, onError]);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      // Limpar conexão anterior
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = getWebSocketUrl();
      console.log('[RealtimeSTT] Connecting to:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[RealtimeSTT] Connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;

          // Enviar configuração
          ws.send(JSON.stringify({
            type: 'config',
            language,
            sampleRate,
            format: audioFormat,
          }));

          onConnect?.();
          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as TranscriptionEvent;
            handleEvent(data);

            if (data.sessionId && !sessionId) {
              setSessionId(data.sessionId);
            }
          } catch (e) {
            console.warn('[RealtimeSTT] Failed to parse message:', event.data);
          }
        };

        ws.onerror = (event) => {
          console.error('[RealtimeSTT] WebSocket error:', event);
          setError('Connection error');
          onError?.('Connection error');
        };

        ws.onclose = (event) => {
          console.log('[RealtimeSTT] Disconnected:', event.code, event.reason);
          setIsConnected(false);
          setIsTranscribing(false);
          wsRef.current = null;

          onDisconnect?.();

          // Auto-reconnect
          if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
            console.log(`[RealtimeSTT] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }

          resolve(false);
        };

        // Timeout para conexão
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            resolve(false);
          }
        }, 10000);

      } catch (e) {
        console.error('[RealtimeSTT] Connection failed:', e);
        setError('Failed to connect');
        resolve(false);
      }
    });
  }, [getWebSocketUrl, language, sampleRate, audioFormat, handleEvent, onConnect, onDisconnect, onError, autoReconnect, sessionId]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('[RealtimeSTT] Disconnecting...');

    // Cancelar reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttempts.current = maxReconnectAttempts; // Prevenir auto-reconnect

    // Enviar mensagem de fim
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
      } catch (e) {
        // Ignore
      }
    }

    // Fechar conexão
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsTranscribing(false);
    setSessionId(null);
  }, []);

  /**
   * Enviar chunk de áudio
   */
  const sendAudio = useCallback((audioData: Blob | ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[RealtimeSTT] Cannot send audio: not connected');
      return;
    }

    // Enviar como binary
    if (audioData instanceof Blob) {
      audioData.arrayBuffer().then((buffer) => {
        wsRef.current?.send(buffer);
      });
    } else {
      wsRef.current.send(audioData);
    }
  }, []);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    sendAudio,
    transcription,
    words,
    isConnected,
    isTranscribing,
    error,
    sessionId,
  };
}

export default useRealtimeSTT;
