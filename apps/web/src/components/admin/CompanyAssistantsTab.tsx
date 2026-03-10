/**
 * CompanyAssistantsTab - Vinculacao de Assistentes por Empresa
 * Permite configurar quais assistentes cada empresa tem acesso
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Building,
  Loader2,
  Plus,
  Trash2,
  Star,
  GripVertical,
  Settings,
  Save,
  Link,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface Company {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
}

interface CompanyAssistant {
  id: string;
  company_id: string;
  assistant_id: string;
  is_active: boolean;
  is_default: boolean;
  position: number;
  custom_system_prompt: string | null;
  assistant?: Assistant;
}

const APP_URL = process.env.NEXT_PUBLIC_COMPANY_APP_URL || "https://core.iconsai.ai";

export default function CompanyAssistantsTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [companyAssistants, setCompanyAssistants] = useState<CompanyAssistant[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("name");

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load assistants
      const { data: assistantsData, error: assistantsError } = await supabase
        .from("assistants")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("name");

      if (assistantsError) throw assistantsError;
      setAssistants(assistantsData || []);

      // Set first company as selected
      if (companiesData && companiesData.length > 0 && !selectedCompany) {
        setSelectedCompany(companiesData[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  // Load company assistants
  const loadCompanyAssistants = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from("company_assistants")
        .select(`
          *,
          assistant:assistants(id, name, slug, description, is_active)
        `)
        .eq("company_id", selectedCompany)
        .order("position");

      if (error) throw error;
      setCompanyAssistants(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar vinculacoes:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCompanyAssistants();
  }, [selectedCompany]);

  // Add assistant to company
  const handleAddAssistant = async (assistantId: string) => {
    if (!selectedCompany) return;

    // Check if already exists
    if (companyAssistants.some((ca) => ca.assistant_id === assistantId)) {
      toast.error("Assistente ja vinculado a esta empresa");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("company_assistants").insert({
        company_id: selectedCompany,
        assistant_id: assistantId,
        is_active: true,
        is_default: companyAssistants.length === 0, // First one is default
        position: companyAssistants.length,
      });

      if (error) throw error;
      toast.success("Assistente vinculado com sucesso");
      loadCompanyAssistants();
    } catch (error: any) {
      console.error("Erro ao vincular assistente:", error);
      toast.error("Erro ao vincular assistente");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove assistant from company
  const handleRemoveAssistant = async (companyAssistantId: string) => {
    if (!confirm("Deseja realmente remover este assistente da empresa?")) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("company_assistants")
        .delete()
        .eq("id", companyAssistantId);

      if (error) throw error;
      toast.success("Assistente removido");
      loadCompanyAssistants();
    } catch (error: any) {
      toast.error("Erro ao remover assistente");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle default
  const handleToggleDefault = async (companyAssistant: CompanyAssistant) => {
    setIsSaving(true);
    try {
      // Remove default from others
      if (!companyAssistant.is_default) {
        await supabase
          .from("company_assistants")
          .update({ is_default: false })
          .eq("company_id", selectedCompany);
      }

      // Toggle this one
      const { error } = await supabase
        .from("company_assistants")
        .update({ is_default: !companyAssistant.is_default })
        .eq("id", companyAssistant.id);

      if (error) throw error;
      loadCompanyAssistants();
    } catch (error: any) {
      toast.error("Erro ao alterar padrao");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (companyAssistant: CompanyAssistant) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("company_assistants")
        .update({ is_active: !companyAssistant.is_active })
        .eq("id", companyAssistant.id);

      if (error) throw error;
      loadCompanyAssistants();
    } catch (error: any) {
      toast.error("Erro ao alterar status");
    } finally {
      setIsSaving(false);
    }
  };

  // Save custom prompt
  const handleSaveCustomPrompt = async (companyAssistantId: string, prompt: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("company_assistants")
        .update({ custom_system_prompt: prompt || null })
        .eq("id", companyAssistantId);

      if (error) throw error;
      toast.success("Prompt personalizado salvo");
      loadCompanyAssistants();
    } catch (error: any) {
      toast.error("Erro ao salvar prompt");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy link
  const handleCopyLink = async (assistantSlug: string) => {
    const company = companies.find((c) => c.id === selectedCompany);
    if (!company?.slug) {
      toast.error("Empresa nao possui slug configurado");
      return;
    }

    const link = `${APP_URL}/${company.slug}?agent=${assistantSlug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(assistantSlug);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  // Get available assistants (not yet linked)
  const availableAssistants = assistants.filter(
    (a) => !companyAssistants.some((ca) => ca.assistant_id === a.id)
  );

  const selectedCompanyData = companies.find((c) => c.id === selectedCompany);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assistentes por Empresa</h2>
        <p className="text-muted-foreground">
          Configure quais assistentes cada empresa tem acesso
        </p>
      </div>

      {/* Company Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Selecionar Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                    {company.slug && (
                      <span className="text-muted-foreground ml-2">
                        (/{company.slug})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCompanyData?.slug && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link className="w-4 h-4" />
                <span>{APP_URL}/{selectedCompanyData.slug}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCompany && (
        <>
          {/* Add Assistant */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Assistente
              </CardTitle>
              <CardDescription>
                Vincule um novo assistente a esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableAssistants.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Todos os assistentes ja estao vinculados a esta empresa
                </p>
              ) : (
                <div className="flex items-center gap-4">
                  <Select onValueChange={handleAddAssistant}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Selecione um assistente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssistants.map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id}>
                          {assistant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Assistants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Assistentes Vinculados
              </CardTitle>
              <CardDescription>
                {companyAssistants.length} assistente(s) configurado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companyAssistants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum assistente vinculado</p>
                  <p className="text-sm">Adicione assistentes acima</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {companyAssistants.map((ca) => (
                    <AccordionItem
                      key={ca.id}
                      value={ca.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <span className="font-medium">
                              {ca.assistant?.name || "Assistente"}
                            </span>
                          </div>
                          {ca.is_default && (
                            <Badge className="bg-yellow-500/10 text-yellow-600">
                              <Star className="w-3 h-3 mr-1" />
                              Padrao
                            </Badge>
                          )}
                          <Badge variant={ca.is_active ? "default" : "secondary"}>
                            {ca.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        {/* Link */}
                        {selectedCompanyData?.slug && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <Link className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-mono flex-1">
                              {APP_URL}/{selectedCompanyData.slug}?agent={ca.assistant?.slug}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyLink(ca.assistant?.slug || "")}
                            >
                              {copiedId === ca.assistant?.slug ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                window.open(
                                  `${APP_URL}/${selectedCompanyData.slug}?agent=${ca.assistant?.slug}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ca.is_active}
                                onCheckedChange={() => handleToggleActive(ca)}
                              />
                              <Label>Ativo</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ca.is_default}
                                onCheckedChange={() => handleToggleDefault(ca)}
                              />
                              <Label>Padrao</Label>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAssistant(ca.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>

                        {/* Custom Prompt */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Prompt Personalizado (opcional)
                          </Label>
                          <Textarea
                            placeholder="Deixe em branco para usar o prompt padrao do assistente..."
                            rows={4}
                            defaultValue={ca.custom_system_prompt || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (ca.custom_system_prompt || "")) {
                                handleSaveCustomPrompt(ca.id, e.target.value);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Este prompt substituira o prompt padrao do assistente apenas para esta empresa
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
