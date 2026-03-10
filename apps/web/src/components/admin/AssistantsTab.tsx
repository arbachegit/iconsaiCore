/**
 * AssistantsTab - Gerenciamento de Agentes de IA
 * @version 2.0.0
 *
 * Inclui configuracao completa de TTS:
 * - Vozes ElevenLabs (formais e informais)
 * - Humanizacao (neutro, amigavel, expressivo)
 * - Leitura de numeros e PT-BR
 * - Stability, Similarity Boost, Style
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  Power,
  PowerOff,
  Volume2,
  Play,
  Square,
  Link,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Settings,
  X,
  Database,
  Brain,
  Mic,
  Sliders,
  Heart,
  Type,
  Hash,
} from "lucide-react";

const VOICE_API_URL = process.env.NEXT_PUBLIC_VOICE_API_URL || "";
const APP_URL = "https://core.iconsai.ai";

interface TTSSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  humanization_level: "neutro" | "amigavel" | "expressivo";
  number_reading: "extenso" | "digito" | "hibrido";
  pt_br_enhanced: boolean;
}

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string | null;
  model: string;
  voice_id: string | null;
  is_active: boolean;
  is_default: boolean;
  knowledge_slugs: string[];
  temperature: number;
  max_tokens: number;
  avatar_url: string | null;
  metadata: {
    tts_settings?: TTSSettings;
  } | null;
  created_at: string;
  updated_at: string;
}

// Vozes ElevenLabs - Formais, Informais e PT-BR Nativas
const ELEVENLABS_VOICES = [
  // Vozes PT-BR Nativas (Recomendadas para Brasileiro)
  {
    id: "vibfi5nlk3hs8Mtvf9Oy",
    name: "Ana",
    description: "Voz feminina brasileira relaxada e natural. Perfeita para narracoes.",
    gender: "Feminina",
    style: "PT-BR",
    recommended: true,
  },
  {
    id: "7eUAxNOneHxqfyRS77mW",
    name: "Carla",
    description: "Voz feminina brasileira jovem e amigavel. Ideal para chat e redes sociais.",
    gender: "Feminina",
    style: "PT-BR",
    recommended: true,
  },
  {
    id: "nHNZWlqUWtEKPr3hhFQP",
    name: "Daiane",
    description: "Voz feminina brasileira jovem, suave e doce. Perfeita para entretenimento.",
    gender: "Feminina",
    style: "PT-BR",
  },
  // Vozes Formais (Inglesas com bom PT-BR)
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Voz feminina clara e natural. Excelente para PT-BR corporativo.",
    gender: "Feminina",
    style: "Formal",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Voz masculina profunda e confiante.",
    gender: "Masculina",
    style: "Formal",
  },
  {
    id: "ODq5zmih8GrVes37Dizd",
    name: "Patrick",
    description: "Voz masculina neutra e versatil.",
    gender: "Masculina",
    style: "Formal",
  },
  {
    id: "jsCqWAovK2LkecY7zXl4",
    name: "Callum",
    description: "Voz masculina suave e acolhedora.",
    gender: "Masculina",
    style: "Formal",
  },
  // Vozes Informais (Descontraidas)
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    description: "Voz feminina jovem e descontraida.",
    gender: "Feminina",
    style: "Informal",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    description: "Voz feminina suave e acolhedora.",
    gender: "Feminina",
    style: "Informal",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    description: "Voz masculina jovem e amigavel.",
    gender: "Masculina",
    style: "Informal",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    description: "Voz masculina casual e conversacional.",
    gender: "Masculina",
    style: "Informal",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    description: "Voz feminina jovem e amigavel.",
    gender: "Feminina",
    style: "Informal",
  },
];

// Niveis de Humanizacao
const HUMANIZATION_LEVELS = {
  neutro: {
    label: "Neutro",
    description: "Fala clara e direta, sem emocoes extras",
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.0,
  },
  amigavel: {
    label: "Amigavel (Recomendado)",
    description: "Tom acolhedor e natural, ideal para atendimento",
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
  },
  expressivo: {
    label: "Expressivo",
    description: "Mais emocao e variacao tonal",
    stability: 0.3,
    similarity_boost: 0.65,
    style: 0.5,
  },
};

// Modos de leitura de numeros
const NUMBER_READING_MODES = {
  extenso: {
    label: "Por extenso",
    description: "123 = 'cento e vinte e tres'",
  },
  digito: {
    label: "Digito a digito",
    description: "123 = 'um dois tres'",
  },
  hibrido: {
    label: "Hibrido (Recomendado)",
    description: "Telefones por digito, valores por extenso",
  },
};

const AVAILABLE_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (Recomendado)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (Mais rapido)" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const DEFAULT_TTS_SETTINGS: TTSSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
  humanization_level: "amigavel",
  number_reading: "hibrido",
  pt_br_enhanced: true,
};

const DEFAULT_ASSISTANT = {
  name: "ICONSAI - SABE TUDO",
  slug: "sabe-tudo",
  description: "Assistente principal que responde sobre qualquer assunto",
  system_prompt: "Voce e o ICONSAI, um assistente de voz inteligente desenvolvido pela Arbache AI. Voce e especialista em responder perguntas sobre qualquer assunto de forma clara, objetiva e amigavel. Sempre responda em portugues brasileiro.",
  model: "gpt-4o",
  voice_id: "21m00Tcm4TlvDq8ikWAM",
  is_default: true,
};

export default function AssistantsTab() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedTTS, setExpandedTTS] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form state para novo agente
  const [isCreating, setIsCreating] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    slug: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o",
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    knowledge_slugs: [] as string[],
    knowledge_input: "",
    tts_settings: { ...DEFAULT_TTS_SETTINGS },
  });

  // Local TTS settings state (para edicao em tempo real)
  const [localTTSSettings, setLocalTTSSettings] = useState<Record<string, TTSSettings>>({});

  // Local knowledge slugs for editing
  const [localKnowledgeSlugs, setLocalKnowledgeSlugs] = useState<Record<string, string[]>>({});
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});

  // Load assistants
  const loadAssistants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistants")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0 || !data.find(a => a.is_default)) {
        await createDefaultAssistant();
        return;
      }

      setAssistants(data || []);

      // Initialize local TTS settings and knowledge slugs
      const settings: Record<string, TTSSettings> = {};
      const slugs: Record<string, string[]> = {};
      data.forEach((a) => {
        settings[a.id] = a.metadata?.tts_settings || { ...DEFAULT_TTS_SETTINGS };
        slugs[a.id] = a.knowledge_slugs || [];
      });
      setLocalTTSSettings(settings);
      setLocalKnowledgeSlugs(slugs);
    } catch (error: any) {
      console.error("Erro ao carregar agentes:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultAssistant = async () => {
    try {
      const { error } = await supabase.from("assistants").insert({
        ...DEFAULT_ASSISTANT,
        is_active: true,
        metadata: { tts_settings: DEFAULT_TTS_SETTINGS },
      });

      if (error && !error.message.includes("duplicate")) throw error;
      loadAssistants();
    } catch (error: any) {
      console.error("Erro ao criar agente padrao:", error);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCopyLink = async (assistant: Assistant) => {
    const link = `${APP_URL}/pwa?agent=${assistant.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(assistant.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleTestVoice = async (voiceId: string, assistantId: string, ttsSettings?: TTSSettings) => {
    if (isPlaying === assistantId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlaying(assistantId);

    try {
      const testText = "Ola! Esta e uma demonstracao da minha voz. Como posso ajudar voce hoje?";

      const response = await fetch(`${VOICE_API_URL}/functions/v1/text-to-speech-karaoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          voice: voiceId,
          chatType: "assistant",
          tts_settings: ttsSettings,
        }),
      });

      if (!response.ok) throw new Error("Falha ao gerar audio");

      const data = await response.json();
      if (!data.audioBase64) throw new Error("Audio nao recebido");

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        toast.error("Erro ao reproduzir audio");
        setIsPlaying(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Erro ao testar voz:", error);
      toast.error("Erro ao testar voz");
      setIsPlaying(null);
    }
  };

  const handleSaveAssistant = async (assistant: Assistant, updates: Partial<Assistant>) => {
    setSavingId(assistant.id);
    try {
      const { error } = await supabase
        .from("assistants")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success("Configuracao salva!");
      loadAssistants();
    } catch (error: any) {
      toast.error("Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveTTSSettings = async (assistant: Assistant) => {
    const settings = localTTSSettings[assistant.id];
    if (!settings) return;

    await handleSaveAssistant(assistant, {
      metadata: { ...assistant.metadata, tts_settings: settings },
    });
  };

  const updateLocalTTSSettings = (assistantId: string, updates: Partial<TTSSettings>) => {
    setLocalTTSSettings((prev) => ({
      ...prev,
      [assistantId]: {
        ...(prev[assistantId] || DEFAULT_TTS_SETTINGS),
        ...updates,
      },
    }));
  };

  const applyHumanizationPreset = (assistantId: string, level: keyof typeof HUMANIZATION_LEVELS) => {
    const preset = HUMANIZATION_LEVELS[level];
    updateLocalTTSSettings(assistantId, {
      humanization_level: level,
      stability: preset.stability,
      similarity_boost: preset.similarity_boost,
      style: preset.style,
    });
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    setIsCreating(true);
    try {
      const slug = newAgent.slug || generateSlug(newAgent.name);

      const { error } = await supabase.from("assistants").insert({
        name: newAgent.name.trim(),
        slug,
        description: newAgent.description.trim() || null,
        system_prompt: newAgent.system_prompt.trim() || null,
        model: newAgent.model,
        voice_id: newAgent.voice_id,
        knowledge_slugs: newAgent.knowledge_slugs,
        is_active: true,
        is_default: false,
        metadata: { tts_settings: newAgent.tts_settings },
      });

      if (error) throw error;

      toast.success("Agente criado com sucesso!");
      setNewAgent({
        name: "",
        slug: "",
        description: "",
        system_prompt: "",
        model: "gpt-4o",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        knowledge_slugs: [],
        knowledge_input: "",
        tts_settings: { ...DEFAULT_TTS_SETTINGS },
      });
      loadAssistants();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Ja existe um agente com esse slug");
      } else {
        toast.error(error.message || "Erro ao criar agente");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (assistant: Assistant) => {
    if (assistant.is_default) {
      toast.error("Nao e possivel desativar o agente padrao");
      return;
    }

    try {
      const { error } = await supabase
        .from("assistants")
        .update({ is_active: !assistant.is_active })
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success(assistant.is_active ? "Agente desativado" : "Agente ativado");
      loadAssistants();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async (assistant: Assistant) => {
    if (assistant.is_default) {
      toast.error("Nao e possivel excluir o agente padrao");
      return;
    }

    if (!confirm(`Deseja realmente excluir o agente "${assistant.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("assistants")
        .delete()
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success("Agente excluido");
      loadAssistants();
    } catch {
      toast.error("Erro ao excluir agente");
    }
  };

  // Render TTS Settings Panel
  const renderTTSSettings = (assistant: Assistant) => {
    const settings = localTTSSettings[assistant.id] || DEFAULT_TTS_SETTINGS;
    const currentVoice = ELEVENLABS_VOICES.find((v) => v.id === assistant.voice_id);

    return (
      <div className="space-y-6 pt-4">
        {/* Humanization Level */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <Heart className="w-4 h-4 text-pink-500" />
            Nivel de Humanizacao
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(HUMANIZATION_LEVELS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => applyHumanizationPreset(assistant.id, key as keyof typeof HUMANIZATION_LEVELS)}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  ${settings.humanization_level === key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }
                `}
              >
                <p className="font-medium text-sm">{value.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{value.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <Mic className="w-4 h-4 text-blue-500" />
            Voz
          </Label>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pt-br">PT-BR</TabsTrigger>
              <TabsTrigger value="formal">Formais</TabsTrigger>
              <TabsTrigger value="informal">Informais</TabsTrigger>
            </TabsList>
            {["all", "pt-br", "formal", "informal"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-2">
                {ELEVENLABS_VOICES.filter(
                  (v) => tab === "all" || v.style.toLowerCase() === tab
                ).map((voice) => (
                  <div
                    key={voice.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                      ${assistant.voice_id === voice.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                      }
                    `}
                    onClick={() => handleSaveAssistant(assistant, { voice_id: voice.id })}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          assistant.voice_id === voice.id ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{voice.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {voice.gender}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              voice.style === "PT-BR"
                                ? "bg-green-500/10 text-green-500 border-green-500/30"
                                : voice.style === "Informal"
                                ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                            }`}
                          >
                            {voice.style}
                          </Badge>
                          {voice.recommended && (
                            <Badge className="bg-green-500/10 text-green-500 text-xs">
                              Recomendada
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{voice.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestVoice(voice.id, `${assistant.id}-${voice.id}`, settings);
                      }}
                      disabled={isPlaying !== null && isPlaying !== `${assistant.id}-${voice.id}`}
                    >
                      {isPlaying === `${assistant.id}-${voice.id}` ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Number Reading */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <Hash className="w-4 h-4 text-orange-500" />
            Leitura de Numeros
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(NUMBER_READING_MODES).map(([key, value]) => (
              <button
                key={key}
                onClick={() => updateLocalTTSSettings(assistant.id, {
                  number_reading: key as TTSSettings["number_reading"],
                })}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  ${settings.number_reading === key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }
                `}
              >
                <p className="font-medium text-sm">{value.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{value.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* PT-BR Enhanced */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Type className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-sm">Leitura PT-BR Aprimorada</p>
              <p className="text-xs text-muted-foreground">
                Pronuncia correta de siglas, abreviacoes e expressoes brasileiras
              </p>
            </div>
          </div>
          <Switch
            checked={settings.pt_br_enhanced}
            onCheckedChange={(checked) =>
              updateLocalTTSSettings(assistant.id, { pt_br_enhanced: checked })
            }
          />
        </div>

        {/* Advanced Settings */}
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span className="font-medium">Configuracoes Avancadas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Stability */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Estabilidade</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.stability * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.stability]}
                  onValueChange={([value]) =>
                    updateLocalTTSSettings(assistant.id, { stability: value })
                  }
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maior = mais consistente, Menor = mais expressivo
                </p>
              </div>

              {/* Similarity Boost */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fidelidade a Voz</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.similarity_boost * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.similarity_boost]}
                  onValueChange={([value]) =>
                    updateLocalTTSSettings(assistant.id, { similarity_boost: value })
                  }
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Quao similar a voz original deve ser
                </p>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Exageracao de Estilo</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.style * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.style]}
                  onValueChange={([value]) =>
                    updateLocalTTSSettings(assistant.id, { style: value })
                  }
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Intensidade das caracteristicas de estilo da voz
                </p>
              </div>

              {/* Speaker Boost */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Speaker Boost</Label>
                  <p className="text-xs text-muted-foreground">
                    Melhora a clareza em ambientes ruidosos
                  </p>
                </div>
                <Switch
                  checked={settings.use_speaker_boost}
                  onCheckedChange={(checked) =>
                    updateLocalTTSSettings(assistant.id, { use_speaker_boost: checked })
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Save Button */}
        <Button
          onClick={() => handleSaveTTSSettings(assistant)}
          disabled={savingId === assistant.id}
          className="w-full"
        >
          {savingId === assistant.id ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Salvar Configuracoes TTS
            </>
          )}
        </Button>
      </div>
    );
  };

  // Render agent card
  const renderAgentCard = (assistant: Assistant) => {
    const agentLink = `${APP_URL}/pwa?agent=${assistant.slug}`;
    const isExpanded = expandedTTS === assistant.id;

    return (
      <Card key={assistant.id} className={assistant.is_default ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${assistant.is_default ? "bg-primary/20" : "bg-muted"}`}>
                {assistant.is_default ? (
                  <Sparkles className="w-6 h-6 text-primary" />
                ) : (
                  <Bot className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {assistant.name}
                  {assistant.is_default && (
                    <Badge className="bg-primary/20 text-primary text-xs">Principal</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {assistant.description || "Sem descricao"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={assistant.is_active ? "default" : "secondary"}>
                {assistant.is_active ? "Ativo" : "Inativo"}
              </Badge>
              {!assistant.is_default && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(assistant)}
                  >
                    {assistant.is_active ? (
                      <PowerOff className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Power className="w-4 h-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(assistant)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Knowledge Slugs - Editable */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Fontes de Conhecimento (Slugs RAG/Scraping)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o slug e pressione Enter"
                value={slugInputs[assistant.id] || ""}
                onChange={(e) => setSlugInputs(prev => ({ ...prev, [assistant.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && slugInputs[assistant.id]?.trim()) {
                    e.preventDefault();
                    const slug = slugInputs[assistant.id].trim().toLowerCase().replace(/\s+/g, "-");
                    const currentSlugs = localKnowledgeSlugs[assistant.id] || [];
                    if (!currentSlugs.includes(slug)) {
                      const newSlugs = [...currentSlugs, slug];
                      setLocalKnowledgeSlugs(prev => ({ ...prev, [assistant.id]: newSlugs }));
                      handleSaveAssistant(assistant, { knowledge_slugs: newSlugs });
                    }
                    setSlugInputs(prev => ({ ...prev, [assistant.id]: "" }));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (slugInputs[assistant.id]?.trim()) {
                    const slug = slugInputs[assistant.id].trim().toLowerCase().replace(/\s+/g, "-");
                    const currentSlugs = localKnowledgeSlugs[assistant.id] || [];
                    if (!currentSlugs.includes(slug)) {
                      const newSlugs = [...currentSlugs, slug];
                      setLocalKnowledgeSlugs(prev => ({ ...prev, [assistant.id]: newSlugs }));
                      handleSaveAssistant(assistant, { knowledge_slugs: newSlugs });
                    }
                    setSlugInputs(prev => ({ ...prev, [assistant.id]: "" }));
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {(localKnowledgeSlugs[assistant.id]?.length > 0 || assistant.knowledge_slugs?.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(localKnowledgeSlugs[assistant.id] || assistant.knowledge_slugs || []).map((slug) => (
                  <Badge key={slug} variant="secondary" className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {slug}
                    <button
                      type="button"
                      onClick={() => {
                        const currentSlugs = localKnowledgeSlugs[assistant.id] || assistant.knowledge_slugs || [];
                        const newSlugs = currentSlugs.filter(s => s !== slug);
                        setLocalKnowledgeSlugs(prev => ({ ...prev, [assistant.id]: newSlugs }));
                        handleSaveAssistant(assistant, { knowledge_slugs: newSlugs });
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {(!localKnowledgeSlugs[assistant.id] || localKnowledgeSlugs[assistant.id].length === 0) &&
             (!assistant.knowledge_slugs || assistant.knowledge_slugs.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum slug configurado. Adicione slugs para RAG ou Scraping.</p>
            )}
          </div>

          {/* Link de Acesso */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Link className="w-4 h-4" />
              Link de Acesso
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={agentLink}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" size="icon" onClick={() => handleCopyLink(assistant)}>
                {copiedId === assistant.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(agentLink, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* TTS Settings Toggle */}
          <div className="space-y-3">
            <button
              onClick={() => setExpandedTTS(isExpanded ? null : assistant.id)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Configuracao de Voz e TTS</p>
                  <p className="text-xs text-muted-foreground">
                    {ELEVENLABS_VOICES.find((v) => v.id === assistant.voice_id)?.name || "Rachel"} -{" "}
                    {HUMANIZATION_LEVELS[
                      (assistant.metadata?.tts_settings?.humanization_level ||
                        "amigavel") as keyof typeof HUMANIZATION_LEVELS
                    ]?.label || "Amigavel"}
                  </p>
                </div>
              </div>
              <Settings
                className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>

            {isExpanded && renderTTSSettings(assistant)}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const defaultAssistant = assistants.find((a) => a.is_default);
  const otherAssistants = assistants.filter((a) => !a.is_default);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agentes de IA</h2>
        <p className="text-muted-foreground">Configure os agentes, vozes e TTS</p>
      </div>

      {/* Agente Principal */}
      {defaultAssistant && renderAgentCard(defaultAssistant)}

      {/* Outros Agentes */}
      {otherAssistants.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Outros Agentes</h3>
          {otherAssistants.map(renderAgentCard)}
        </div>
      )}

      {/* Criar Novo Agente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Agente
          </CardTitle>
          <CardDescription>Configure um novo agente de IA personalizado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome do Agente *</Label>
              <Input
                id="new-name"
                placeholder="Ex: Assistente de Vendas"
                value={newAgent.name}
                onChange={(e) => {
                  setNewAgent({
                    ...newAgent,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-slug">Slug (URL)</Label>
              <Input
                id="new-slug"
                placeholder="assistente-vendas"
                value={newAgent.slug}
                onChange={(e) => setNewAgent({ ...newAgent, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-description">Descricao</Label>
            <Input
              id="new-description"
              placeholder="Breve descricao do agente"
              value={newAgent.description}
              onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-prompt">Prompt do Sistema</Label>
            <Textarea
              id="new-prompt"
              placeholder="Instrucoes de comportamento para o agente..."
              rows={4}
              value={newAgent.system_prompt}
              onChange={(e) => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
            />
          </div>

          {/* Knowledge Slugs */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Fontes de Conhecimento (Slugs RAG/Scraping)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o slug e pressione Enter"
                value={newAgent.knowledge_input}
                onChange={(e) => setNewAgent({ ...newAgent, knowledge_input: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAgent.knowledge_input.trim()) {
                    e.preventDefault();
                    const slug = newAgent.knowledge_input.trim().toLowerCase().replace(/\s+/g, "-");
                    if (!newAgent.knowledge_slugs.includes(slug)) {
                      setNewAgent({
                        ...newAgent,
                        knowledge_slugs: [...newAgent.knowledge_slugs, slug],
                        knowledge_input: "",
                      });
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (newAgent.knowledge_input.trim()) {
                    const slug = newAgent.knowledge_input.trim().toLowerCase().replace(/\s+/g, "-");
                    if (!newAgent.knowledge_slugs.includes(slug)) {
                      setNewAgent({
                        ...newAgent,
                        knowledge_slugs: [...newAgent.knowledge_slugs, slug],
                        knowledge_input: "",
                      });
                    }
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {newAgent.knowledge_slugs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newAgent.knowledge_slugs.map((slug) => (
                  <Badge key={slug} variant="secondary" className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {slug}
                    <button
                      type="button"
                      onClick={() =>
                        setNewAgent({
                          ...newAgent,
                          knowledge_slugs: newAgent.knowledge_slugs.filter((s) => s !== slug),
                        })
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <Select
                value={newAgent.model}
                onValueChange={(value) => setNewAgent({ ...newAgent, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Voz</Label>
              <Select
                value={newAgent.voice_id}
                onValueChange={(value) => setNewAgent({ ...newAgent, voice_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender} - {voice.style})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Humanization Level for new agent */}
          <div className="space-y-2">
            <Label>Nivel de Humanizacao</Label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(HUMANIZATION_LEVELS).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setNewAgent({
                      ...newAgent,
                      tts_settings: {
                        ...newAgent.tts_settings,
                        humanization_level: key as TTSSettings["humanization_level"],
                        stability: value.stability,
                        similarity_boost: value.similarity_boost,
                        style: value.style,
                      },
                    })
                  }
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${
                      newAgent.tts_settings.humanization_level === key
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }
                  `}
                >
                  <p className="font-medium text-sm">{value.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{value.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreateAgent} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Agente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
