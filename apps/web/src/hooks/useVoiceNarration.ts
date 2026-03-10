// =============================================
// useVoiceNarration.ts v2.0 - FIXED
// Build: 2026-01-21
// FIX: Adiciona cleanup de URL.revokeObjectURL no unmount
// FIX: Adiciona useEffect de cleanup para evitar memory leak
// =============================================
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseVoiceNarrationReturn {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  play: () => Promise<void>;
  stop: () => void;
}

export function useVoiceNarration(topic: string): UseVoiceNarrationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = ""; // FIX: Limpar src para liberar recurso
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // FIX: Cleanup ao desmontar componente (evita memory leak)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const play = useCallback(async () => {
    // If already playing, stop
    if (isPlaying) {
      stop();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch script from database
      console.log(`[VoiceNarration] Fetching script for topic: ${topic}`);
      
      const { data: scriptResponse, error: scriptError } = await supabase.functions.invoke(
        "get-presentation-script",
        { body: { topic } }
      );

      if (scriptError || !scriptResponse?.success) {
        throw new Error(scriptResponse?.error || scriptError?.message || "Erro ao buscar script");
      }

      const script = scriptResponse.data;
      if (!script?.audio_script) {
        throw new Error("Script não encontrado ou vazio");
      }

      console.log(`[VoiceNarration] Script found: ${script.title}`);

      // Step 2: Generate audio via TTS (using Voice API backend)
      const voiceApiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(
        `${voiceApiUrl}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: script.audio_script,
            voice: "nova",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no TTS: ${response.status} - ${errorText}`);
      }

      // Step 3: Create audio blob and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setError("Erro ao reproduzir áudio");
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      console.log(`[VoiceNarration] Playing audio for: ${script.title}`);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[VoiceNarration] Error:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [topic, isPlaying, stop]);

  return {
    isLoading,
    isPlaying,
    error,
    play,
    stop,
  };
}
