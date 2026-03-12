import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, Copy, CheckCircle2, MonitorPlay } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Panel = Tables<"iptv_panels">;

export function CreateTrialDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [systemType, setSystemType] = useState("p2p");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const { data: panels } = useQuery({
    queryKey: ["iptv-panels-orange"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptv_panels")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      
      // Filter in memory for robustness and uniquely identifiable cache
      return data?.filter(p => p.name === "TVS-R6TV") || [];
    },
  });

  const handleCreate = async () => {
    if (!selectedPanel) {
      toast({ title: "Erro", description: "Selecione um painel", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const response = await supabase.functions.invoke("create-trial", {
        body: {
          panel_id: selectedPanel,
          system_type: systemType,
          notes: notes || "teste-auto",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar teste");
      }

      const data = response.data;

      if (data.success) {
        setResult(data.data);
        toast({
          title: "Teste criado com sucesso! 🎉",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao criar teste",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setResult(null);
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
          <FlaskConical className="w-4 h-4 mr-2" />
          Criar Teste
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Criar Usuário de Teste
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Painel *</Label>
              <Select value={selectedPanel} onValueChange={setSelectedPanel}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione o painel" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {panels?.map((panel) => (
                    <SelectItem key={panel.id} value={panel.id} className="text-white hover:bg-slate-700">
                      {panel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Sistema *</Label>
              <Select value={systemType} onValueChange={setSystemType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="p2p" className="text-white hover:bg-slate-700">P2P</SelectItem>
                  <SelectItem value="iptv" className="text-white hover:bg-slate-700">IPTV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Observação (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: teste para cliente fulano"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating || !selectedPanel}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando teste...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Criar Teste ({systemType.toUpperCase()})
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Será criado um teste de aproximadamente 3 horas no sistema selecionado.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="relative overflow-hidden bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center space-y-4">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MonitorPlay className="w-16 h-16" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-amber-400 font-bold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Teste {systemType.toUpperCase()} Criado
                </h3>
                <p className="text-slate-400 text-sm font-medium">🚀 Bem vindo a R6TV</p>
              </div>

              <div className="grid gap-3 pt-2">
                {/* Flexible data detection */}
                {(() => {
                  // Mapeamento profundo para encontrar o usuário e senha
                  const username = result.username || result.user || result.login || result.client_username || 
                                  result.userIptv?.username || result.userIptv?.user || result.id || result.name;
                  
                  const password = result.password || result.pass || result.client_password || 
                                  result.userIptv?.password || result.userIptv?.pass || result.senha;
                  
                  const token = result.token || result.hash || result.auth_token;
                  
                  // Tentar pegar a primeira URL curta disponível ou a URL padrão
                  const url = result.urls?.m3u8Short || result.urls?.m3u8 || result.url || result.dns;
                  
                  const hasCredentials = username || password || token || url;

                  if (!hasCredentials) {
                    return (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-left">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Dados do Teste</p>
                        <pre className="text-[10px] text-amber-50 font-mono break-all whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <>
                      {username && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between group">
                          <div className="text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Usuário</p>
                            <p className="text-amber-50 font-mono text-lg">{String(username)}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                            onClick={() => {
                              navigator.clipboard.writeText(String(username));
                              toast({ title: "Copiado!", description: "Usuário copiado para a área de transferência" });
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
                            <p className="text-amber-50 font-mono text-lg">{String(password)}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                            onClick={() => {
                              navigator.clipboard.writeText(String(password));
                              toast({ title: "Copiado!", description: "Senha copiada para a área de transferência" });
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
                              <p className="text-amber-50 font-mono text-[11px] break-all leading-relaxed">{String(token)}</p>
                            </div>
                          )}
                          {url && (
                            <div className="text-left border-t border-slate-700/30 pt-2">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">URL</p>
                              <p className="text-amber-50 font-mono text-[11px] break-all leading-relaxed">{String(url)}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="pt-2">
                {result.endTime && (
                  <p className="text-sm text-slate-300">
                    ⌛ Expira em: <span className="text-amber-400 font-bold">{String(result.endTime)}</span>
                  </p>
                )}
                <p className="text-sm text-amber-400 font-medium">Boa diversão! ✨</p>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
