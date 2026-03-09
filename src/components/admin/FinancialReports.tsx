import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

interface MonthlyStats {
  month: string;
  totalPayments: number;
  expenses: number;
  grossRevenue: number;
  netProfit: number;
  date: Date;
}

export function FinancialReports() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["financial-reports"],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("status", "approved");

      if (error) throw error;

      const grouped = payments.reduce((acc: Record<string, MonthlyStats>, payment) => {
        const date = new Date(payment.created_at);
        const monthKey = format(date, "yyyy-MM");
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
            totalPayments: 0,
            expenses: 0,
            grossRevenue: 0,
            netProfit: 0,
            date: date
          };
        }

        const amount = Number(payment.amount);
        acc[monthKey].totalPayments += 1;
        acc[monthKey].grossRevenue += amount;
        acc[monthKey].expenses += 12;
        acc[monthKey].netProfit += (amount - 12);

        return acc;
      }, {});

      return Object.values(grouped).sort((a, b) => b.date.getTime() - a.date.getTime());
    },
  });

  if (isLoading) return <div className="text-center text-slate-400 py-8">Carregando extratos...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {reports?.map((report, index) => (
          <Card key={index} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-white capitalize">
                Extrato de {report.month}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1">Planos Renovados</p>
                  <p className="text-2xl font-bold text-white">{report.totalPayments}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1 text-red-400" /> Despesas (Custo Fixo)
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    R$ {report.expenses.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-blue-400" /> Receita Bruta
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    R$ {report.grossRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1 text-green-400" /> Lucro Líquido
                  </p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {report.netProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {reports?.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            Nenhum extrato disponível ainda.
          </div>
        )}
      </div>
    </div>
  );
}
