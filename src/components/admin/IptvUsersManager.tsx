import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, User, Copy, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type IptvUser = Tables<"iptv_users">;

export function IptvUsersManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IptvUser | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: "",
    amount_due: 0,
    customer_name: "",
    customer_email: "",
    is_active: true,
    plan_id: "" as string,
    panel_id: "" as string,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["iptv-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptv_users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as IptvUser[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["iptv-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: panels } = useQuery({
    queryKey: ["iptv-panels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptv_panels")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveUser = useMutation({
    mutationFn: async (user: typeof formData & { id?: string }) => {
      if (user.id) {
        const { error } = await supabase
          .from("iptv_users")
          .update(user as any)
          .eq("id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("iptv_users")
          .insert([user]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: `Usuário ${editingUser ? 'atualizado' : 'cadastrado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar usuário: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("iptv_users")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-users"] });
      toast({
        title: "Sucesso!",
        description: "Usuário removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover usuário: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      amount_due: 0,
      customer_name: "",
      customer_email: "",
      is_active: true,
      plan_id: "",
      panel_id: "",
    });
    setEditingUser(null);
  };

  const openEditDialog = (user: IptvUser) => {
    setFormData({
      username: user.username,
      amount_due: Number(user.amount_due),
      customer_name: user.customer_name || "",
      customer_email: user.customer_email || "",
      is_active: user.is_active,
      plan_id: user.plan_id || "",
      panel_id: user.panel_id || "",
    });
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { plan_id, panel_id, ...rest } = formData;
    const userData = editingUser 
      ? { ...rest, plan_id: plan_id || null, panel_id: panel_id || null, id: editingUser.id }
      : { ...rest, plan_id: plan_id || null, panel_id: panel_id || null };
    saveUser.mutate(userData as any);
  };

  const copyCheckoutLink = (username: string) => {
    const link = `${window.location.origin}/checkout?user=${username}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "Link de checkout copiado para a área de transferência.",
    });
  };

  const openCheckoutLink = (username: string) => {
    const link = `${window.location.origin}/checkout?user=${username}`;
    window.open(link, '_blank');
  };

  if (isLoading) return <div className="text-center text-white">Carregando usuários...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gerenciar Usuários IPTV</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário IPTV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-slate-300">Nome de Usuário IPTV *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Ex: usuario123"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="amount_due" className="text-slate-300">Valor que o usuário deve pagar (R$) *</Label>
                <Input
                  id="amount_due"
                  type="number"
                  step="0.01"
                  value={formData.amount_due}
                  onChange={(e) => setFormData({ ...formData, amount_due: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="plan_id" className="text-slate-300">Plano de Renovação *</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id} className="text-white">
                        {plan.name} - {plan.duration_days} dias - R$ {Number(plan.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="panel_id" className="text-slate-300">Painel IPTV *</Label>
                <Select
                  value={formData.panel_id}
                  onValueChange={(value) => setFormData({ ...formData, panel_id: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione o painel" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {panels?.map((panel) => (
                      <SelectItem key={panel.id} value={panel.id} className="text-white">
                        {panel.name} — {panel.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="customer_name" className="text-slate-300">Nome do Cliente</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Nome opcional do cliente"
                />
              </div>

              <div>
                <Label htmlFor="customer_email" className="text-slate-300">Email do Cliente</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active_user"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active_user" className="text-slate-300">Usuário Ativo</Label>
              </div>
              
              <Button type="submit" disabled={saveUser.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {saveUser.isPending ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Cadastrar Usuário')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map((user) => (
          <Card key={user.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  {user.username}
                </div>
                <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-green-400">R$ {Number(user.amount_due).toFixed(2)}</span>
                {user.plan_id && plans && (
                  <div className="text-xs text-blue-400 mt-1">
                    {plans.find(p => p.id === user.plan_id)?.name || 'Plano vinculado'} — {plans.find(p => p.id === user.plan_id)?.duration_days || '?'} dias
                  </div>
                )}
              </div>
              
              {user.customer_name && (
                <div className="text-sm text-slate-300">
                  <strong>Nome:</strong> {user.customer_name}
                </div>
              )}
              
              {user.customer_email && (
                <div className="text-sm text-slate-300">
                  <strong>Email:</strong> {user.customer_email}
                </div>
              )}
              
              <div className="text-xs text-slate-400">
                Cadastrado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteUser.mutate(user.id)} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200" disabled={deleteUser.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyCheckoutLink(user.username)}
                    className="flex-1 bg-green-900/20 border-green-600 text-green-300 hover:bg-green-900/40"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copiar Link
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openCheckoutLink(user.username)}
                    className="flex-1 bg-blue-900/20 border-blue-600 text-blue-300 hover:bg-blue-900/40"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users?.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">Nenhum usuário cadastrado</h3>
          <p className="text-slate-500">Cadastre usuários IPTV para gerar links de checkout personalizados.</p>
        </div>
      )}
    </div>
  );
}