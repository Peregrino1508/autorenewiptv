import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PanelsManager } from "@/components/admin/PanelsManager";
import { PlansManager } from "@/components/admin/PlansManager";
import { PaymentsViewer } from "@/components/admin/PaymentsViewer";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { IptvUsersManager } from "@/components/admin/IptvUsersManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Activity, Settings, CreditCard, Package, Users, LogOut, ShoppingCart } from "lucide-react";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [panelsResult, plansResult, paymentsResult] = await Promise.all([
        supabase.from("iptv_panels").select("*", { count: "exact" }),
        supabase.from("plans").select("*", { count: "exact" }),
        supabase.from("payments").select("amount, status").eq("status", "approved"),
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, payment) => 
        sum + Number(payment.amount), 0
      ) || 0;

      return {
        totalPanels: panelsResult.count || 0,
        totalPlans: plansResult.count || 0,
        totalPayments: paymentsResult.data?.length || 0,
        totalRevenue: totalRevenue.toFixed(2),
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e510_1px,transparent_1px),linear-gradient(to_bottom,#4f46e510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-pulse" />
      
      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              Painel Administrativo
            </h1>
            <p className="text-slate-400 text-lg">Gestão completa do sistema IPTV</p>
            {user?.email && (
              <p className="text-slate-500 text-sm mt-1">Logado como: {user.email}</p>
            )}
          </div>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-white/5 border-white/20 text-slate-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Painéis Ativos</p>
                  <p className="text-3xl font-bold text-white">{stats?.totalPanels || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Planos Criados</p>
                  <p className="text-3xl font-bold text-white">{stats?.totalPlans || 0}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Pagamentos</p>
                  <p className="text-3xl font-bold text-white">{stats?.totalPayments || 0}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-full">
                  <Activity className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Receita Total</p>
                  <p className="text-3xl font-bold text-white">R$ {stats?.totalRevenue || '0.00'}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Gestão do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="panels" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-white/10 rounded-lg p-1">
                <TabsTrigger 
                  value="panels" 
                  className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Painéis
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger 
                  value="plans" 
                  className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Planos
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagamentos
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </TabsTrigger>
              </TabsList>

          <TabsContent value="panels" className="mt-6">
            <PanelsManager />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <IptvUsersManager />
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <PlansManager />
          </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentsViewer />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <SettingsManager />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;