/**
 * ============================================================
 * PWA Voice Module - Voice to Text Service
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-02-03
 *
 * Serviço de transcrição de voz para texto.
 * Utiliza o Python Backend com Whisper.
 * ============================================================
 */

/**
 * Resposta do serviço de transcrição
 */
export interface VoiceToTextResponse {
  text: string;
  confidence?: number;
  duration?: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

/**
 * Parâmetros para transcrição
 */
export interface VoiceToTextParams {
  /** Blob de áudio */
  audioBlob?: Blob;
  /** Áudio em base64 */
  audioBase64?: string;
  /** MIME type do áudio */
  mimeType: string;
  /** Idioma (default: pt-BR) */
  language?: string;
  /** Incluir timestamps de palavras */
  includeWordTimestamps?: boolean;
}

/**
 * Erro customizado de transcrição
 */
export class VoiceToTextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "VoiceToTextError";
  }
}

/**
 * Converte Blob para Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remover prefixo data:audio/...;base64,
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcreve áudio para texto
 * @throws {VoiceToTextError} em caso de erro
 */
export async function transcribeAudio(params: VoiceToTextParams): Promise<VoiceToTextResponse> {
  const { audioBlob, audioBase64, mimeType, language = "pt", includeWordTimestamps = false } = params;

  console.log("[VoiceToText] Iniciando transcrição...");

  try {
    // Obter base64 do áudio
    let base64Data = audioBase64;
    if (!base64Data && audioBlob) {
      base64Data = await blobToBase64(audioBlob);
    }

    if (!base64Data) {
      throw new VoiceToTextError(
        "Nenhum áudio fornecido",
        "NO_AUDIO"
      );
    }

    console.log("[VoiceToText] Chamando voice-to-text backend...");

    // Usar Python Backend para transcrição
    const voiceApiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await fetch(`${voiceApiUrl}/functions/v1/voice-to-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: base64Data,
        mimeType,
        language,
        includeWordTimestamps,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[VoiceToText] API Error:", response.status, errorData);
      throw new VoiceToTextError(
        errorData.error || `Erro ao transcrever áudio: ${response.status}`,
        "API_ERROR"
      );
    }

    const data = await response.json();

    const text = data?.text;
    if (!text?.trim()) {
      throw new VoiceToTextError(
        "Não foi possível entender o áudio",
        "EMPTY_TRANSCRIPTION"
      );
    }

    console.log("[VoiceToText] ✅ Transcrição concluída:", text.substring(0, 50) + "...");

    return {
      text: text.trim(),
      confidence: data?.confidence,
      duration: data?.duration,
      words: data?.words,
    };
  } catch (err) {
    if (err instanceof VoiceToTextError) {
      throw err;
    }

    console.error("[VoiceToText] Erro inesperado:", err);
    throw new VoiceToTextError(
      err instanceof Error ? err.message : "Erro desconhecido",
      "UNKNOWN_ERROR",
      err
    );
  }
}
