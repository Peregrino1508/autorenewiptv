import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Key, ShieldCheck, AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Webhook, Lock } from "lucide-react";

export function MercadoPagoIntegration() {
  const queryClient = useQueryClient();
  
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showInputAccessToken, setShowInputAccessToken] = useState(false);
  const [showInputWebhookSecret, setShowInputWebhookSecret] = useState(false);

  // Fetch current admin's MP credentials
  const { data: credentials, isLoading } = useQuery({
    queryKey: ["admin-mp-credentials"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("admin_mp_credentials")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const hasPublicKey = !!credentials?.mp_public_key;
  const hasAccessToken = !!credentials?.mp_access_token;
  const isFullyConfigured = hasPublicKey && hasAccessToken;

  const webhookUrl = "https://snoiymaflwumwlbschau.supabase.co/functions/v1/mp-webhook";

  const saveCredentials = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const updates: Record<string, any> = {};
      if (publicKey.trim()) updates.mp_public_key = publicKey.trim();
      if (accessToken.trim()) updates.mp_access_token = accessToken.trim();
      if (webhookSecret.trim()) updates.mp_webhook_secret = webhookSecret.trim();

      if (Object.keys(updates).length === 0) {
        throw new Error("Preencha pelo menos um campo");
      }

      if (credentials) {
        // Update existing
        const { error } = await supabase
          .from("admin_mp_credentials")
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("admin_mp_credentials")
          .insert([{ user_id: user.id, ...updates }] as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mp-credentials"] });
      setPublicKey("");
      setAccessToken("");
      setWebhookSecret("");
      toast({
        title: "Sucesso! ✅",
        description: "Credenciais do Mercado Pago salvas com sucesso.",
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
      <Card className={`border ${isFullyConfigured ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"} backdrop-blur-sm`}>
        <CardContent className="p-4 flex items-center gap-3">
          {isFullyConfigured ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">
                Mercado Pago totalmente configurado — Public Key e Access Token salvos.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm font-medium">
                {!hasPublicKey && !hasAccessToken
                  ? "Mercado Pago não configurado. Adicione suas credenciais abaixo."
                  : !hasAccessToken
                    ? "Falta configurar o Access Token para completar a integração."
                    : "Falta configurar a Public Key para completar a integração."
                }
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public Key */}
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
              <div className="space-y-2">
                <Label className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Chave Configurada
                </Label>
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-sm text-emerald-300 font-mono truncate flex-1">
                    {credentials?.mp_public_key}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-400 hover:text-white shrink-0"
                    onClick={() => {
                      if (credentials?.mp_public_key) navigator.clipboard.writeText(credentials.mp_public_key);
                      toast({ title: "Copiado!" });
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
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
          </CardContent>
        </Card>

        {/* Access Token */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-amber-400" />
              Access Token (Backend)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Token secreto usado pelo servidor para criar pagamentos e verificar status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasAccessToken && (
              <div className="space-y-2">
                <Label className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Token Configurado
                </Label>
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-sm text-emerald-300 font-mono truncate flex-1">
                    {showAccessToken
                      ? credentials?.mp_access_token
                      : "••••••••••••••••••••••••••••••••"
                    }
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-400 hover:text-white shrink-0"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="mp_token" className="text-slate-300">
                {hasAccessToken ? "Atualizar Access Token" : "Access Token"}
              </Label>
              <Input
                id="mp_token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1 font-mono text-xs"
                placeholder="APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Secret (Optional) */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Lock className="w-5 h-5 mr-2 text-red-400" />
            Assinatura Secreta do Webhook (Opcional)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Não é obrigatória, mas é <span className="text-amber-300 font-semibold">essencial para sua segurança</span>. Sem ela, qualquer pessoa que descobrir sua URL de webhook pode enviar notificações falsas de pagamento, simulando aprovações que nunca aconteceram. Com a assinatura secreta, o sistema valida que a notificação realmente veio do Mercado Pago.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials?.mp_webhook_secret && (
            <div className="space-y-2">
              <Label className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Assinatura Configurada
              </Label>
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <p className="text-sm text-emerald-300 font-mono truncate flex-1">
                  {showWebhookSecret
                    ? credentials.mp_webhook_secret
                    : "••••••••••••••••••••••••••••••••"
                  }
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-emerald-400 hover:text-white shrink-0"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                >
                  {showWebhookSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="mp_secret" className="text-slate-300">
              {credentials?.mp_webhook_secret ? "Atualizar Assinatura Secreta" : "Assinatura Secreta"}
            </Label>
            <Input
              id="mp_secret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1 font-mono text-xs"
              placeholder="Cole aqui a assinatura secreta do webhook"
            />
          </div>
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-red-400 font-semibold">📍 Onde encontrar:</span> No painel do Mercado Pago → Suas Aplicações → Webhooks → Assinatura Secreta. Copie e cole aqui.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={() => saveCredentials.mutate()}
        disabled={(!publicKey.trim() && !accessToken.trim() && !webhookSecret.trim()) || saveCredentials.isPending}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12 text-base"
      >
        <ShieldCheck className="w-5 h-5 mr-2" />
        {saveCredentials.isPending ? "Salvando..." : "Salvar Credenciais"}
      </Button>

      {/* Webhook URL */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center text-base">
            <Webhook className="w-5 h-5 mr-2 text-purple-400" />
            Webhook URL (Notificações)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure esta URL no painel do Mercado Pago para receber notificações de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <p className="text-sm text-purple-300 font-mono truncate flex-1">
              {webhookUrl}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-purple-400 hover:text-white shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast({ title: "URL copiada!" });
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>1. Acesse o painel do Mercado Pago → Suas Aplicações → Webhooks</p>
            <p>2. Cole a URL acima no campo de Notificações (IPN/Webhooks)</p>
            <p>3. Selecione o evento <code className="text-sky-400">payment</code></p>
          </div>
        </CardContent>
      </Card>

      {/* Links úteis */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-base">🔗 Links Úteis — Mercado Pago Developers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Documentação", href: "https://www.mercadopago.com.br/developers/pt/docs" },
              { label: "Suas Aplicações", href: "https://www.mercadopago.com.br/developers/panel/app" },
              { label: "Credenciais", href: "https://www.mercadopago.com.br/developers/panel/app" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
              >
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0" />
                <span className="text-sm text-slate-300 group-hover:text-white">{link.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
