import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Server } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Panel = Tables<"iptv_panels">;

export function PanelsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    admin_user: "",
    admin_password: "",
    panel_type: "xui_one",
    is_active: true,
    notes: "",
  });

  // Fetch panels
  const { data: panels, isLoading } = useQuery({
    queryKey: ["iptv-panels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptv_panels")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update panel mutation
  const savePanel = useMutation({
    mutationFn: async (panel: typeof formData & { id?: string }) => {
      if (panel.id) {
        const { error } = await supabase
          .from("iptv_panels")
          .update(panel as any)
          .eq("id", panel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("iptv_panels")
          .insert([panel]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-panels"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: `Painel ${editingPanel ? 'atualizado' : 'criado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar painel: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Delete panel mutation
  const deletePanel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("iptv_panels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-panels"] });
      toast({
        title: "Sucesso!",
        description: "Painel removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover painel: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      admin_user: "",
      admin_password: "",
      panel_type: "xui_one",
      is_active: true,
      notes: "",
    });
    setEditingPanel(null);
  };

  const openEditDialog = (panel: Panel) => {
    setFormData({
      name: panel.name,
      url: panel.url,
      admin_user: panel.admin_user,
      admin_password: panel.admin_password,
      panel_type: panel.panel_type,
      is_active: panel.is_active,
      notes: panel.notes || "",
    });
    setEditingPanel(panel);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const panelData = editingPanel 
      ? { ...formData, id: editingPanel.id }
      : formData;
    savePanel.mutate(panelData);
  };

  if (isLoading) {
    return <div className="text-center text-white">Carregando painéis...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gerenciar Painéis IPTV</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Painel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900/95 backdrop-blur-md border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {editingPanel ? 'Editar Painel' : 'Novo Painel IPTV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Painel</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="url">URL do Painel</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="https://painel.exemplo.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="admin_user">Usuário Admin</Label>
                <Input
                  id="admin_user"
                  value={formData.admin_user}
                  onChange={(e) => setFormData({ ...formData, admin_user: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="admin_password">Senha Admin</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Painel Ativo</Label>
              </div>
              
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Notas adicionais sobre o painel..."
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={savePanel.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                {savePanel.isPending ? 'Salvando...' : (editingPanel ? 'Atualizar' : 'Criar Painel')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {panels?.map((panel) => (
          <Card key={panel.id} className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-400" />
                  {panel.name}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${panel.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-slate-300">
                  <span className="font-medium">URL:</span> {panel.url}
                </p>
                <p className="text-slate-300">
                  <span className="font-medium">Admin:</span> {panel.admin_user}
                </p>
                <p className="text-slate-300">
                  <span className="font-medium">Tipo:</span> {panel.panel_type.toUpperCase()}
                </p>
                {panel.notes && (
                  <p className="text-slate-300">
                    <span className="font-medium">Notas:</span> {panel.notes}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(panel)}
                  className="border-white/20 hover:bg-white/10 text-white"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deletePanel.mutate(panel.id)}
                  className="border-red-400/20 hover:bg-red-500/10 text-red-400"
                  disabled={deletePanel.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {panels?.length === 0 && (
        <div className="text-center py-12">
          <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Nenhum painel cadastrado ainda.</p>
          <p className="text-slate-500">Adicione seu primeiro painel IPTV para começar.</p>
        </div>
      )}
    </div>
  );
}