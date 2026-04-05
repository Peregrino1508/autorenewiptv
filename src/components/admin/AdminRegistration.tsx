import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Eye, EyeOff, Phone, Mail, MapPin, Shield } from "lucide-react";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function AdminRegistration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    state: "",
  });

  // Check if current user is super admin
  const { data: isSuperAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("admin_profiles")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .single();
      return data?.is_super_admin ?? false;
    },
    enabled: !!user?.id,
  });

  // Fetch all admin profiles
  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin === true,
  });

  // Create admin mutation
  const createAdmin = useMutation({
    mutationFn: async (adminData: typeof formData) => {
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: adminData,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Admin cadastrado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar admin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete admin mutation
  const deleteAdmin = useMutation({
    mutationFn: async (adminUserId: string) => {
      // Use service role via edge function would be better, but for now
      // we delete the profile (cascade will handle auth user)
      const { error } = await supabase
        .from("admin_profiles")
        .delete()
        .eq("user_id", adminUserId)
        .eq("is_super_admin", false); // Prevent deleting super admin
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Admin removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover admin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ full_name: "", email: "", password: "", phone: "", city: "", state: "" });
    setShowPassword(false);
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 11; // DDD (2) + número (9)
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(formData.phone)) {
      toast({
        title: "Telefone inválido",
        description: "O telefone deve conter exatamente 11 dígitos (DDD + número).",
        variant: "destructive",
      });
      return;
    }
    createAdmin.mutate(formData);
  };

  if (checkingRole || !isSuperAdmin) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">
            {checkingRole ? "Verificando permissões..." : "Você não tem permissão para acessar esta seção."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Administradores Cadastrados</h3>
          <p className="text-sm text-slate-400">Gerencie os administradores do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Novo Administrador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome Completo</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nome completo do administrador"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">E-mail</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Telefone (WhatsApp com DDD)</Label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setFormData({ ...formData, phone: digits });
                  }}
                  placeholder="11999999999"
                  maxLength={11}
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-slate-500">Exatamente 11 dígitos: DDD (2) + número (9)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Cidade</Label>
                <Input
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade de residência"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Estado</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    {BRAZILIAN_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf} className="text-white hover:bg-white/10">
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={createAdmin.isPending || !formData.state}
              >
                {createAdmin.isPending ? "Cadastrando..." : "Cadastrar Administrador"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin List */}
      {isLoading ? (
        <p className="text-slate-400">Carregando administradores...</p>
      ) : admins && admins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((admin) => (
            <Card key={admin.id} className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{admin.full_name}</h4>
                      {admin.is_super_admin && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" />
                          Super Admin
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{admin.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{admin.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{admin.city} - {admin.state}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Cadastrado em: {new Date(admin.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {!admin.is_super_admin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja remover este administrador?")) {
                          deleteAdmin.mutate(admin.user_id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">Nenhum administrador cadastrado além de você.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
