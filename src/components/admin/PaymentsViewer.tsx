import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard } from "lucide-react";

export function PaymentsViewer() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["iptv-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          plans (name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (isLoading) return <div className="text-center text-white">Carregando pagamentos...</div>;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <CreditCard className="w-5 h-5 mr-2 text-blue-400" />
          Últimos Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-700">
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300">Data</TableHead>
                <TableHead className="text-slate-300">Cliente / Usuário</TableHead>
                <TableHead className="text-slate-300">Plano</TableHead>
                <TableHead className="text-slate-300">Valor</TableHead>
                <TableHead className="text-slate-300">Status Pgto</TableHead>
                <TableHead className="text-slate-300">Renovação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id} className="border-slate-700 hover:bg-slate-800">
                  <TableCell className="text-slate-300 font-medium">
                    {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="text-white">{payment.customer_name || 'N/A'}</div>
                    <div className="text-xs text-slate-400 font-mono">{payment.iptv_username}</div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {payment.plans?.name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300 font-medium">
                    R$ {Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-0 ${getStatusColor(payment.status)}`}>
                      {payment.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-0 ${getStatusColor(payment.renewal_status || 'pending')}`}>
                      {(payment.renewal_status || 'pending').toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Nenhum pagamento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}