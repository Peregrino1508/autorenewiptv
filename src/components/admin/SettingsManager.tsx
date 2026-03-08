import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Settings, Key, MessageSquare } from "lucide-react";

export function SettingsManager() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({
    mp_public_key: "",
    whatsapp_number: "",
    support_email: "",
    company_name: "Meu IPTV",
  });

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (dbSettings) {
      const newSettings = { ...settings };
      dbSettings.forEach((setting) => {
        newSettings[setting.key] = setting.value || "";
      });
      setSettings(newSettings);
    }
  }, [dbSettings]);

  const saveSettings = useMutation({
    mutationFn: async (updatedSettings: Record<string, string>) => {
      const promises = Object.entries(updatedSettings).map(async ([key, value]) => {
        const existing = dbSettings?.find(s => s.key === key);
        if (existing) {
          return supabase.from("settings").update({ value } as any).eq("key", key);
        } else {
          return supabase.from("settings").insert([{ key, value }]);
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({
        title: "Sucesso!",
        description: "Configurações atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings.mutate(settings);
  };

  if (isLoading) return <div className="text-center text-white">Carregando configurações...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Key className="w-5 h-5 mr-2 text-yellow-400" />
              Integrações
            </CardTitle>
            <CardDescription className="text-slate-400">
              Credenciais públicas para serviços externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mp_public_key" className="text-slate-300">Mercado Pago Public Key</Label>
              <Input
                id="mp_public_key"
                value={settings.mp_public_key}
                onChange={(e) => handleChange("mp_public_key", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="APP_USR-..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Necessário para renderizar o checkout no frontend. (Access Token já configurado nas Edge Functions)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-400" />
              Contato & Empresa
            </CardTitle>
            <CardDescription className="text-slate-400">
              Informações visíveis para os clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company_name" className="text-slate-300">Nome da Empresa</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Meu IPTV"
              />
            </div>
            <div>
              <Label htmlFor="whatsapp_number" className="text-slate-300">Número do WhatsApp</Label>
              <Input
                id="whatsapp_number"
                value={settings.whatsapp_number}
                onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="5511999999999"
              />
              <p className="text-xs text-slate-500 mt-1">Apenas números, com DDI e DDD.</p>
            </div>
            <div>
              <Label htmlFor="support_email" className="text-slate-300">E-mail de Suporte</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email}
                onChange={(e) => handleChange("support_email", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="suporte@exemplo.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={saveSettings.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          <Settings className="w-4 h-4 mr-2" />
          {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </form>
  );
}