import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Key, ShieldCheck, AlertTriangle, CheckCircle2, Copy } from "lucide-react";

export function MercadoPagoIntegration() {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["mp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["mp_public_key", "mp_access_token"]);
      if (error) throw error;
      return data;
    },
  });

  const hasPublicKey = currentSettings?.some(
    (s) => s.key === "mp_public_key" && s.value && s.value.length > 5
  );

  const saveKeys = useMutation({
    mutationFn: async () => {
      if (publicKey.trim()) {
        const existing = currentSettings?.find((s) => s.key === "mp_public_key");
        if (existing) {
          await supabase.from("settings").update({ value: publicKey.trim() } as any).eq("key", "mp_public_key");
        } else {
          await supabase.from("settings").insert([{ key: "mp_public_key", value: publicKey.trim() }]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-settings"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      setPublicKey("");
      setAccessToken("");
      toast({
        title: "Sucesso! ✅",
        description: "Chave pública do Mercado Pago salva com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar: " + error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div className="text-center text-white">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={`border ${hasPublicKey ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"} backdrop-blur-sm`}>
        <CardContent className="p-4 flex items-center gap-3">
          {hasPublicKey ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">
                Mercado Pago integrado — Public Key configurada.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm font-medium">
                Mercado Pago não configurado. Adicione suas credenciais abaixo.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public Key Config */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Key className="w-5 h-5 mr-2 text-sky-400" />
              Public Key (Frontend)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Chave pública usada para renderizar o checkout no navegador do cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPublicKey && (
              <div className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 font-mono truncate flex-1">
                  {currentSettings?.find((s) => s.key === "mp_public_key")?.value?.slice(0, 20)}...
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white"
                  onClick={() => {
                    const val = currentSettings?.find((s) => s.key === "mp_public_key")?.value;
                    if (val) navigator.clipboard.writeText(val);
                    toast({ title: "Copiado!" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div>
              <Label htmlFor="mp_pub" className="text-slate-300">
                {hasPublicKey ? "Atualizar Public Key" : "Public Key"}
              </Label>
              <Input
                id="mp_pub"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1 font-mono text-xs"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <Button
              onClick={() => saveKeys.mutate()}
              disabled={!publicKey.trim() || saveKeys.isPending}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {saveKeys.isPending ? "Salvando..." : "Salvar Public Key"}
            </Button>
          </CardContent>
        </Card>

        {/* Access Token Info */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-amber-400" />
              Access Token (Backend)
            </CardTitle>
            <CardDescription className="text-slate-400">
              O Access Token é configurado como Secret nas Edge Functions do Supabase para segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
              <p className="text-amber-300 text-sm font-medium">⚠️ Configuração via Supabase</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                O Access Token deve ser adicionado como <strong className="text-white">MERCADOPAGO_ACCESS_TOKEN</strong> nos Secrets das Edge Functions no painel do Supabase, nunca no frontend.
              </p>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p>1. Acesse o painel do Supabase → Edge Functions → Secrets</p>
              <p>2. Adicione: <code className="text-sky-400">MERCADOPAGO_ACCESS_TOKEN</code></p>
              <p>3. Cole o token obtido no painel de Desenvolvedores do Mercado Pago</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links úteis */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-base">🔗 Links Úteis — Mercado Pago Developers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
            >
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0" />
              <span className="text-sm text-slate-300 group-hover:text-white">Documentação</span>
            </a>
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
            >
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0" />
              <span className="text-sm text-slate-300 group-hover:text-white">Suas Aplicações</span>
            </a>
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
            >
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0" />
              <span className="text-sm text-slate-300 group-hover:text-white">Credenciais</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
