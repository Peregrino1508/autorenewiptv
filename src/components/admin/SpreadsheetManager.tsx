import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CustomerRecord = {
  id: string;
  client_name: string;
  username: string;
  password: string;
  expiry_month: string;
  status: string;
  next_renewal: string;
  contact_number: string;
  message: string;
  message2: string;
  value: number;
  expense: number;
  profit: number;
  subscription_value: number;
  login_type: string;
  created_at: string;
};

export function SpreadsheetManager() {
  const queryClient = useQueryClient();
  const [localRecords, setLocalRecords] = useState<Partial<CustomerRecord>[]>([]);

  const { data: records, isLoading } = useQuery({
    queryKey: ["customer-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerRecord[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (record: Partial<CustomerRecord>) => {
      if (record.id) {
        const { error } = await supabase
          .from("customer_records")
          .update(record)
          .eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_records")
          .insert([record]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-records"] });
      toast({ title: "Sucesso", description: "Registro salvo com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-records"] });
      toast({ title: "Sucesso", description: "Registro excluído!" });
    },
  });

  const handleAddRow = () => {
    const newRow: Partial<CustomerRecord> = {
      client_name: "",
      username: "",
      password: "",
      expiry_month: "",
      status: "Ativo",
      next_renewal: new Date().toISOString().split("T")[0],
      contact_number: "",
      message: "",
      message2: "",
      value: 0,
      expense: 0,
      subscription_value: 0,
      login_type: "IPTV",
    };
    setLocalRecords([newRow, ...(records || [])]);
  };

  const handleLocalChange = (index: number, field: keyof CustomerRecord, value: any) => {
    const updated = [...(records || [])];
    if (localRecords.length > (records?.length || 0)) {
        const newLocal = [...localRecords];
        newLocal[index] = { ...newLocal[index], [field]: value };
        setLocalRecords(newLocal);
    } else {
        // This logic needs to be more robust for a real spreadsheet
        // For now, let's simplify and update the DB on blur or a save button
    }
  };

  const renderCell = (record: Partial<CustomerRecord>, field: keyof CustomerRecord, type: string = "text", customClass: string = "") => {
    return (
      <Input
        type={type}
        defaultValue={record[field] as any}
        onBlur={(e) => {
          const val = type === "number" ? parseFloat(e.target.value) : e.target.value;
          if (record[field] !== val) {
            saveMutation.mutate({ ...record, [field]: val });
          }
        }}
        className={`bg-transparent border-none focus:ring-1 focus:ring-purple-500 h-8 text-xs text-white p-1 ${customClass}`}
      />
    );
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  const displayRecords = localRecords.length > (records?.length || 0) ? localRecords : (records || []);

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-400" />
          Cadastro de Usuários (Planilha)
        </CardTitle>
        <Button onClick={handleAddRow} className="bg-green-600 hover:bg-green-700 text-white size-sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Linha
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-white/10">
            <TableRow className="border-white/10">
              <TableHead className="text-slate-300 text-xs font-bold w-[250px]">Cliente</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[180px]">Usuário</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[180px]">Senha</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Mês Venc.</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Status</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[130px]">Próx. Renov.</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[150px]">Contato</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[200px]">Msg 1</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[200px]">Msg 2</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Valor</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Despesa</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Lucro</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold">Assinatura</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[120px]">Login (P2P/IPTV)</TableHead>
              <TableHead className="text-slate-300 text-xs font-bold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRecords.map((record, idx) => (
              <TableRow key={record.id || `new-${idx}`} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="p-1">{renderCell(record, "client_name", "text", "w-[240px]")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "username", "text", "w-[170px]")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "password", "text", "w-[170px]")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "expiry_month")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "status")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "next_renewal", "date")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "contact_number")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "message")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "message2")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "value", "number")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "expense", "number")}</TableCell>
                <TableCell className="p-1">
                  <span className="text-xs text-green-400 font-medium px-2">
                    R$ {(record.profit || 0).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="p-1">{renderCell(record, "subscription_value", "number")}</TableCell>
                <TableCell className="p-1">{renderCell(record, "login_type")}</TableCell>
                <TableCell className="p-1">
                  {record.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(record.id!)}
                      className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {displayRecords.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            Nenhum registro encontrado. Clique em "Nova Linha" para começar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
