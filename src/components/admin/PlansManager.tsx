import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Plan = Tables<"plans">;

export function PlansManager() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    duration_days: 30,
    price: 0,
    is_active: true,
    description: "",
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["iptv-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const savePlan = useMutation({
    mutationFn: async (plan: typeof formData & { id?: string }) => {
      if (plan.id) {
        const { error } = await supabase
          .from("plans")
          .update(plan as any)
          .eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plans")
          .insert([{ ...plan, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-plans"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: `Plano ${editingPlan ? 'atualizado' : 'criado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar plano: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iptv-plans"] });
      toast({
        title: "Sucesso!",
        description: "Plano removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover plano: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      duration_days: 30,
      price: 0,
      is_active: true,
      description: "",
    });
    setEditingPlan(null);
  };

  const openEditDialog = (plan: Plan) => {
    setFormData({
      name: plan.name,
      duration_days: plan.duration_days,
      price: plan.price,
      is_active: plan.is_active,
      description: plan.description || "",
    });
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planData = editingPlan 
      ? { ...formData, id: editingPlan.id }
      : formData;
    savePlan.mutate(planData);
  };

  if (isLoading) return <div className="text-center text-white">Carregando planos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gerenciar Planos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-slate-300">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Ex: Mensal Básico"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration" className="text-slate-300">Duração (Dias)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="text-slate-300">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active_plan"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active_plan" className="text-slate-300">Plano Ativo</Label>
              </div>
              
              <Button type="submit" disabled={savePlan.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {savePlan.isPending ? 'Salvando...' : (editingPlan ? 'Atualizar' : 'Criar Plano')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <Card key={plan.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  {plan.name}
                </div>
                <div className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-white">R$ {plan.price.toFixed(2)}</span>
                <span className="text-slate-400 ml-2">/ {plan.duration_days} dias</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(plan)} className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deletePlan.mutate(plan.id)} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200" disabled={deletePlan.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}