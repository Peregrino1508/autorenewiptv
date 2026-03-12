import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PanelsManager } from "@/components/admin/PanelsManager";
import { PlansManager } from "@/components/admin/PlansManager";
import { PaymentsViewer } from "@/components/admin/PaymentsViewer";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { IptvUsersManager } from "@/components/admin/IptvUsersManager";
import { SpreadsheetManager } from "@/components/admin/SpreadsheetManager";
import { CreateTrialDialog } from "@/components/admin/CreateTrialDialog";
import { CreateTrialWWPanelDialog } from "@/components/admin/CreateTrialWWPanelDialog";
import { DynamicTrialDialog } from "@/components/admin/DynamicTrialDialog";
import { FinancialReports } from "@/components/admin/FinancialReports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Activity, Settings, CreditCard, Package, Users, LogOut, ShoppingCart, DollarSign, FileText, Menu, FileSpreadsheet } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [panelsResult, plansResult, paymentsResult] = await Promise.all([
        supabase.from("iptv_panels").select("*", { count: "exact", head: true }),
        supabase.from("plans").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "approved").gte("created_at", startOfMonth),
      ]);

      let monthlyProfit = 0;
      const monthlyPayments = paymentsResult.data?.length || 0;

      paymentsResult.data?.forEach(payment => {
        monthlyProfit += (Number(payment.amount) - 12);
      });

      return {
        totalPanels: panelsResult.count || 0,
        totalPlans: plansResult.count || 0,
        monthlyPayments,
        monthlyProfit: monthlyProfit.toFixed(2),
      };
    },
  });

  // Fetch panels for dynamic test buttons
  const { data: activePanels } = useQuery({
    queryKey: ["active-panels-buttons"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("iptv_panels")
          .select("id, name, panel_type, notes, test_button_name")
          .eq("is_active", true);
        
        if (error) throw error;
        
        // Mapear painéis extraindo o nome do botão da coluna ou das notas (backup)
        return (data || []).map(p => {
          let btnName = (p as any).test_button_name;
          
          // Se não tem na coluna, tenta extrair das notas
          if (!btnName && p.notes && p.notes.includes("||BTN:")) {
            btnName = p.notes.split("||BTN:")[1];
          }
          
          return { ...p, test_button_name: btnName };
        }).filter(p => p.test_button_name);

      } catch (error: any) {
        console.error("Erro ao carregar botões dinâmicos:", error);
        return [];
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e510_1px,transparent_1px),linear-gradient(to_bottom,#4f46e510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-pulse" />
      
      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2 truncate">
              Painel Administrativo
            </h1>
            <p className="text-slate-400 text-sm md:text-lg">Gestão completa do sistema IPTV</p>
            {user?.email && (
              <p className="text-slate-500 text-xs mt-1 hidden md:block">Logado como: {user.email}</p>
            )}
          </div>
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/5 border-white/20 text-slate-300">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-900 border-white/10 text-white w-[280px]">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-white">Ações do Admin</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4">
                  {activePanels?.map((panel) => (
                    <DynamicTrialDialog key={panel.id} panel={panel as any} />
                  ))}
                  {!activePanels?.length && (
                    <>
                      <CreateTrialDialog />
                      <CreateTrialWWPanelDialog />
                    </>
                  )}
                  <Button
                    onClick={() => navigate("/checkout")}
                    variant="outline"
                    className="w-full bg-white/5 border-white/20 text-slate-300 justify-start"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Ir para Checkout
                  </Button>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full bg-white/5 border-white/20 text-slate-300 justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                  {user?.email && (
                    <div className="mt-auto pt-8 border-t border-white/5">
                      <p className="text-slate-500 text-xs">Logado como:</p>
                      <p className="text-slate-300 text-sm truncate">{user.email}</p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex gap-3">
            {activePanels?.map((panel) => (
              <DynamicTrialDialog key={panel.id} panel={panel as any} />
            ))}
            {!activePanels?.length && (
              <>
                <CreateTrialDialog />
                <CreateTrialWWPanelDialog />
              </>
            )}
            <Button
              onClick={() => navigate("/checkout")}
              variant="outline"
              className="bg-white/5 border-white/20 text-slate-300 hover:bg-green-500/20 hover:border-green-500/40 hover:text-green-400"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ir para Checkout
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="bg-white/5 border-white/20 text-slate-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
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
                  <p className="text-slate-400 text-sm font-medium">Pagamentos do Mês</p>
                  <p className="text-3xl font-bold text-white">{stats?.monthlyPayments || 0}</p>
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
                  <p className="text-slate-400 text-sm font-medium">Lucro do Mês</p>
                  <p className="text-3xl font-bold text-white">R$ {stats?.monthlyProfit || '0.00'}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-400" />
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
              <TabsList className="flex w-full items-start justify-start overflow-x-auto bg-white/10 rounded-lg p-1 gap-1 sm:flex-wrap sm:items-center sm:justify-center">
                <TabsTrigger 
                  value="panels" 
                  className="flex-1 min-w-[100px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Painéis
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="flex-1 min-w-[100px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger 
                  value="plans" 
                  className="flex-1 min-w-[100px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Planos
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="flex-1 min-w-[110px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagamentos
                </TabsTrigger>
                <TabsTrigger 
                  value="financial" 
                  className="flex-1 min-w-[100px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Extratos
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="flex-1 min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </TabsTrigger>
                <TabsTrigger 
                  value="spreadsheet" 
                  className="flex-1 min-w-[100px] md:min-w-[120px] data-[state=active]:bg-purple-500/30 data-[state=active]:text-white text-slate-300 text-xs md:text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Cadastro
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

              <TabsContent value="financial" className="mt-6">
                <FinancialReports />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <SettingsManager />
              </TabsContent>

              <TabsContent value="spreadsheet" className="mt-6">
                <SpreadsheetManager />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;