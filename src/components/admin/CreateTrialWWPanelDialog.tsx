import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, Play, Copy, CheckCircle2, MonitorPlay } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Panel = Tables<"iptv_panels">;

export function CreateTrialWWPanelDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [testType, setTestType] = useState("wplay");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const { data: panels } = useQuery({
    queryKey: ["iptv-panels-wwpanel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptv_panels")
        .select("*")
        .eq("is_active", true)
        .eq("panel_type", "wwpanel")
        .order("name");
      if (error) throw error;
      return data;
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

      const response = await supabase.functions.invoke("create-trial-wwpanel", {
        body: {
          panel_id: selectedPanel,
          test_type: testType,
          notes: notes || "",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar teste");
      }

      const data = response.data;

      if (data.success) {
        setResult(data.data);
        toast({
          title: "Teste WPlay criado com sucesso! 🎉",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar teste";
      toast({
        title: "Erro ao criar teste WPlay",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setResult(null);
    setNotes("");
    setTestType("wplay");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0">
          <Play className="w-4 h-4 mr-2" />
          Teste WPlay
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Criar Teste WPlay (WWPanel)
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Painel WWPanel *</Label>
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
              <Label className="text-slate-300">Tipo de Teste *</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="wplay" className="text-white hover:bg-slate-700">WPlay (P2P/IPTV)</SelectItem>
                  <SelectItem value="krator" className="text-white hover:bg-slate-700">Krator+</SelectItem>
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
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando teste...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Criar Teste WPlay
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Será criado um teste no painel WWPanel sem consumir créditos.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="relative overflow-hidden bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MonitorPlay className="w-16 h-16" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-emerald-400 font-bold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Teste WPlay P2P/IPTV Criado
                </h3>
                <p className="text-slate-400 text-sm font-medium">🚀 Bem vindo a R6TV</p>
              </div>

              <div className="grid gap-3 pt-2">
                {(() => {
                  const r = result as any;
                  const username = r?.username || r?.user || r?.login || r?.id || r?.name || r?.userIptv?.username;
                  const password = r?.password || r?.pass || r?.senha || r?.userIptv?.password;
                  const hasCredentials = username || password;

                  if (!hasCredentials) {
                    return (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-left">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Dados do Teste</p>
                        <pre className="text-[10px] text-emerald-50 font-mono break-all whitespace-pre-wrap leading-relaxed">
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
                            <p className="text-emerald-50 font-mono text-lg">{String(username)}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10"
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
                            <p className="text-emerald-50 font-mono text-lg">{String(password)}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                            onClick={() => {
                              navigator.clipboard.writeText(String(password));
                              toast({ title: "Copiado!", description: "Senha copiada para a área de transferência" });
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="pt-2">
                <p className="text-sm text-slate-300">
                  ⌛ Seu teste é válido por <span className="text-emerald-400 font-bold">4 horas</span>.
                </p>
                <p className="text-sm text-emerald-400 font-medium">Boa diversão! ✨</p>
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
