import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, Info } from "lucide-react";

function extractSystemFromMessage(message: string | null): string {
  if (!message) return '-';
  const match = message.match(/sistema\s+(p2p|iptv|nexus|red-club)/i);
  return match ? match[1].toUpperCase() : '-';
}

function PaymentStatusBadge({ status }: { status: string }) {
  const isApproved = status === 'approved';
  return (
    <Badge
      variant="outline"
      className={`border-0 font-semibold px-3 py-1 ${
        isApproved
          ? 'bg-green-500/20 text-green-400'
          : 'bg-slate-700/60 text-slate-400'
      }`}
    >
      {isApproved ? 'APROVADO' : status === 'pending' ? 'PENDENTE' : status === 'rejected' ? 'REJEITADO' : status.toUpperCase()}
    </Badge>
  );
}

function RenewalStatusBadge({ status, message }: { status: string | null; message: string | null }) {
  const s = status || 'pending';
  const isSuccess = s === 'success';

  const badge = (
    <Badge
      variant="outline"
      className={`border-0 font-semibold px-3 py-1 cursor-default ${
        isSuccess
          ? 'bg-green-500/20 text-green-400'
          : 'bg-slate-700/60 text-slate-400'
      }`}
    >
      {isSuccess ? 'RENOVADO' : s === 'pending' ? 'PENDENTE' : s === 'failed' ? 'FALHOU' : s.toUpperCase()}
    </Badge>
  );

  if (!message) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1">
            {badge}
            <Info className="w-3 h-3 text-slate-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs bg-slate-800 border-slate-700 text-slate-200">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PaymentsViewerProps {
  searchTerm?: string;
}

export function PaymentsViewer({ searchTerm = "" }: PaymentsViewerProps) {
  const { user } = useAuth();
  const { data: payments, isLoading } = useQuery({
    queryKey: ["iptv-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`*, plans (name)`)
        .eq("admin_id", user?.id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center text-white py-8">Carregando pagamentos...</div>;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <CreditCard className="w-5 h-5 mr-2 text-blue-400" />
          Últimos Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-700 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 whitespace-nowrap">Data</TableHead>
                <TableHead className="text-slate-300">Cliente / Usuário</TableHead>
                <TableHead className="text-slate-300">Plano</TableHead>
                <TableHead className="text-slate-300">Valor</TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">Sistema</TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">Status Pgto</TableHead>
                <TableHead className="text-slate-300">Renovação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.filter(payment => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                  payment.iptv_username.toLowerCase().includes(search) ||
                  (payment.customer_name?.toLowerCase().includes(search) ?? false)
                );
              }).map((payment) => (
                <TableRow key={payment.id} className="border-slate-700 hover:bg-slate-800/60">
                  <TableCell className="text-slate-300 font-medium whitespace-nowrap">
                    {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="text-white font-medium">{payment.customer_name || '—'}</div>
                    <div className="text-xs text-slate-400 font-mono">{payment.iptv_username}</div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {payment.plans?.name || <span className="text-slate-500 text-xs">N/A</span>}
                  </TableCell>
                  <TableCell className="text-white font-semibold whitespace-nowrap">
                    R$ {Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {payment.renewal_status === 'success'
                      ? <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                          {extractSystemFromMessage(payment.renewal_message)}
                        </span>
                      : <span className="text-slate-600 text-xs">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <RenewalStatusBadge status={payment.renewal_status} message={payment.renewal_message} />
                  </TableCell>
                </TableRow>
              ))}
              {payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
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
