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
import { Plus, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
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
      // Remove the generated 'profit' column as it cannot be updated manually
      const { profit, ...dataToSave } = record;
      
      if (record.id) {
        const { error } = await supabase
          .from("customer_records")
          .update(dataToSave)
          .eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_records")
          .insert([dataToSave]);
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
      value: 0,
      expense: 0,
      subscription_value: 0,
      login_type: "IPTV",
    };
    setLocalRecords([newRow, ...(records || [])]);
  };

  const renderCell = (record: Partial<CustomerRecord>, field: keyof CustomerRecord, type: string = "text") => {
    const isText = type === "text";
    
    return (
      <div className="w-full border-r border-white/10">
        {isText ? (
          <textarea
            defaultValue={record[field] as any}
            onBlur={(e) => {
              if (record[field] !== e.target.value) {
                saveMutation.mutate({ ...record, [field]: e.target.value });
              }
            }}
            className="bg-transparent border-none focus:ring-1 focus:ring-purple-500 w-full h-8 text-xs text-white p-2 resize-none overflow-hidden hover:overflow-auto"
            rows={1}
          />
        ) : (
          <Input
            type={type}
            defaultValue={record[field] as any}
            onBlur={(e) => {
              const val = type === "number" ? parseFloat(e.target.value) : e.target.value;
              if (record[field] !== val) {
                saveMutation.mutate({ ...record, [field]: val });
              }
            }}
            className="bg-transparent border-none focus:ring-1 focus:ring-purple-500 h-8 text-xs text-white p-2 w-full"
          />
        )}
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  const displayRecords = localRecords.length > (records?.length || 0) ? localRecords : (records || []);

  const renderHeader = (label: string, initialWidth: string) => (
    <TableHead className={`p-0 h-10 border-r border-white/10 text-slate-300 text-xs font-bold`}>
      <div className={`flex items-center px-2 h-full overflow-hidden resize-x ${initialWidth}`}>
        {label}
      </div>
    </TableHead>
  );

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
        <Table className="min-w-max border-collapse table-auto">
          <TableHeader className="bg-white/10">
            <TableRow className="border-white/10 h-10">
              {renderHeader("Cliente", "w-[250px]")}
              {renderHeader("Usuário", "w-[180px]")}
              {renderHeader("Senha", "w-[180px]")}
              {renderHeader("Mês Venc.", "w-[120px]")}
              {renderHeader("Status", "w-[100px]")}
              {renderHeader("Próx. Renov.", "w-[140px]")}
              {renderHeader("Contato", "w-[160px]")}
              {renderHeader("Valor", "w-[90px]")}
              {renderHeader("Despesa", "w-[90px]")}
              {renderHeader("Lucro", "w-[100px]")}
              {renderHeader("Assinatura", "w-[100px]")}
              {renderHeader("P2P/IPTV", "w-[100px]")}
              <TableHead className="w-[50px] p-0"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRecords.map((record, idx) => (
              <TableRow key={record.id || `new-${idx}`} className="border-white/5 hover:bg-white/5 transition-colors h-8">
                <TableCell className="p-0">{renderCell(record, "client_name")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "username")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "password")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "expiry_month")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "status")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "next_renewal", "date")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "contact_number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "value", "number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "expense", "number")}</TableCell>
                <TableCell className="p-0">
                  <div className="px-2 flex items-center h-8 border-r border-white/10 w-full">
                    <span className="text-xs text-green-400 font-medium">
                      R$ {(record.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="p-0">{renderCell(record, "subscription_value", "number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, "login_type")}</TableCell>
                <TableCell className="p-0">
                  <div className="flex items-center justify-center h-8 w-[50px]">
                    {record.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(record.id!)}
                        className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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
