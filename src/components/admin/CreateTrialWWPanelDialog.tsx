import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, Play } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Panel = Tables<"iptv_panels">;

export function CreateTrialWWPanelDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [testType, setTestType] = useState("wplay");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);

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
    } catch (error: any) {
      toast({
        title: "Erro ao criar teste WPlay",
        description: error.message,
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
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-3">✅ Teste WPlay criado!</h3>
              <div className="space-y-2 text-sm">
                <pre className="text-xs text-slate-400 bg-slate-800 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>

            <Button
              onClick={resetDialog}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Criar Outro Teste
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
