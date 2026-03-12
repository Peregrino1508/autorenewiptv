import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, Play, Copy, CheckCircle2, MonitorPlay } from "lucide-react";

interface DynamicTrialDialogProps {
  panel: {
    id: string;
    name: string;
    panel_type: string;
    test_button_name: string | null;
  };
}

export function DynamicTrialDialog({ panel }: DynamicTrialDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setResult(null);

    try {
      const functionName = panel.panel_type === "wwpanel" ? "create-trial-wwpanel" : "create-trial";
      
      const body: any = {
        panel_id: panel.id,
        notes: "teste-auto-dinamico",
      };

      if (panel.panel_type !== "wwpanel") {
        body.system_type = "p2p"; // Default for generic panels
      } else {
        body.test_type = "wplay"; // Default for WWPanel
      }

      const response = await supabase.functions.invoke(functionName, { body });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar teste");
      }

      const data = response.data;

      if (data.success) {
        setResult(data.data || data); // Store the full data object
        toast({
          title: "Teste criado com sucesso! 🎉",
          description: data.message || "Credenciais geradas.",
        });
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setResult(null);
  };

  // Success Card Component (Shared logic)
  const SuccessCard = () => {
    if (!result) return null;

    // Detection logic for IPTV/P2P data structures
    const username = result.username || result.user || result.login || result.client_username || 
                    result.userIptv?.username || result.userIptv?.user || result.id || result.name;
    
    const password = result.password || result.pass || result.client_password || 
                    result.userIptv?.password || result.userIptv?.pass || result.senha;
    
    const token = result.token || result.hash || result.auth_token;
    
    const url = result.urls?.m3u8Short || result.urls?.m3u8 || result.url || result.dns || result.server;
    
    const hasCredentials = username || password || token || url;

    const isWWPanel = panel.panel_type === "wwpanel";
    const accentColor = isWWPanel ? "emerald" : "amber";

    return (
      <div className="space-y-6 py-2">
        <div className={`relative overflow-hidden bg-${accentColor}-500/10 border border-${accentColor}-500/20 rounded-2xl p-6 text-center space-y-4`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MonitorPlay className="w-16 h-16" />
          </div>
          
          <div className="space-y-1">
            <h3 className={`text-${accentColor}-400 font-bold text-lg flex items-center justify-center gap-2`}>
              <CheckCircle2 className="w-5 h-5" />
              {panel.test_button_name || "Teste Criado"}
            </h3>
            <p className="text-slate-400 text-sm font-medium">🚀 Bem vindo a R6TV</p>
          </div>

          <div className="grid gap-3 pt-2">
            {!hasCredentials ? (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-left">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Dados do Teste</p>
                <pre className={`text-[10px] text-${accentColor}-50 font-mono break-all whitespace-pre-wrap leading-relaxed`}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <>
                {username && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between group">
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Usuário</p>
                      <p className={`text-${accentColor}-50 font-mono text-lg`}>{String(username)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`text-slate-400 hover:text-${accentColor}-400 hover:bg-${accentColor}-400/10`}
                      onClick={() => {
                        navigator.clipboard.writeText(String(username));
                        toast({ title: "Copiado!", description: "Usuário copiado" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {password && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between group">
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Senha</p>
                      <p className={`text-${accentColor}-50 font-mono text-lg`}>{String(password)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`text-slate-400 hover:text-${accentColor}-400 hover:bg-${accentColor}-400/10`}
                      onClick={() => {
                        navigator.clipboard.writeText(String(password));
                        toast({ title: "Copiado!", description: "Senha copiada" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {(token || url) && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                    {token && (
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Token</p>
                        <p className={`text-${accentColor}-50 font-mono text-[11px] break-all leading-relaxed`}>{String(token)}</p>
                      </div>
                    )}
                    {url && (
                      <div className="text-left border-t border-slate-700/30 pt-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">URL</p>
                        <p className={`text-${accentColor}-50 font-mono text-[11px] break-all leading-relaxed`}>{String(url)}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-2">
            <p className={`text-sm text-${accentColor}-400 font-medium`}>Boa diversão! ✨</p>
          </div>
        </div>

        <Button
          onClick={resetDialog}
          variant="outline"
          className="w-full border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Criar Outro Teste
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button className={`bg-gradient-to-r ${panel.panel_type === 'wwpanel' ? 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' : 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'} text-white border-0`}>
          <FlaskConical className="w-4 h-4 mr-2" />
          {panel.test_button_name || `Teste ${panel.name}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className={`text-xl bg-gradient-to-r ${panel.panel_type === 'wwpanel' ? 'from-emerald-400 to-teal-400' : 'from-amber-400 to-orange-400'} bg-clip-text text-transparent`}>
            {panel.test_button_name || `Criar Teste ${panel.name}`}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <p className="text-sm text-slate-300">
                Você está prestes a criar um usuário de teste no painel <span className="text-white font-bold">{panel.name}</span>.
              </p>
              <p className="text-xs text-slate-400">
                O sistema gerará credenciais automaticamente com duração padrão de teste.
              </p>
            </div>
            
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-6 text-lg"
              disabled={isCreating}
              onClick={handleCreate}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Gerar Teste Agora
                </>
              )}
            </Button>
          </div>
        ) : (
          <SuccessCard />
        )}
      </DialogContent>
    </Dialog>
  );
}
