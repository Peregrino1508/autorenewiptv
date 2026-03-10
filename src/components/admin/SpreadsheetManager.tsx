import { useState, useEffect } from "react";
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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    client_name: 250,
    username: 180,
    password: 180,
    expiry_month: 120,
    status: 100,
    next_renewal: 140,
    contact_number: 160,
    value: 90,
    expense: 90,
    profit: 100,
    subscription_value: 100,
    login_type: 100,
  });

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
    onError: (error: any) => {
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

  const onResize = (field: string, deltaX: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [field]: Math.max(50, prev[field] + deltaX),
    }));
  };

  const renderCell = (record: Partial<CustomerRecord>, field: keyof CustomerRecord, type: string = "text") => {
    const isText = type === "text";
    const width = columnWidths[field as string] || 100;
    
    return (
      <div 
        className="h-full border-r border-white/10 overflow-hidden" 
        style={{ width: `${width}px` }}
      >
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

  const ResizeHandle = ({ field }: { field: string }) => {
    const onMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      
      let startX = e.pageX;
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.pageX - startX;
        startX = moveEvent.pageX;
        onResize(field, deltaX);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return (
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-purple-500/50 transition-colors z-20 group"
      >
        <div className="absolute right-0 top-0 h-full w-[2px] bg-white/10 group-hover:bg-purple-500" />
      </div>
    );
  };

  const renderHeader = (label: string, field: string) => {
    const width = columnWidths[field] || 100;
    return (
      <TableHead 
        className="p-0 h-10 border-r border-white/10 text-slate-300 text-xs font-bold relative overflow-visible"
        style={{ width: `${width}px` }}
      >
        <div className="flex items-center px-2 h-full w-full overflow-hidden select-none">
          {label}
        </div>
        <ResizeHandle field={field} />
      </TableHead>
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
        <Table className="border-collapse table-fixed w-max">
          <TableHeader className="bg-white/10">
            <TableRow className="border-white/10 h-10">
              {renderHeader("Cliente", "client_name")}
              {renderHeader("Usuário", "username")}
              {renderHeader("Senha", "password")}
              {renderHeader("Mês Venc.", "expiry_month")}
              {renderHeader("Status", "status")}
              {renderHeader("Próx. Renov.", "next_renewal")}
              {renderHeader("Contato", "contact_number")}
              {renderHeader("Valor", "value")}
              {renderHeader("Despesa", "expense")}
              {renderHeader("Lucro", "profit")}
              {renderHeader("Assinatura", "subscription_value")}
              {renderHeader("P2P/IPTV", "login_type")}
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
                  <div 
                    className="px-2 flex items-center h-8 border-r border-white/10 overflow-hidden"
                    style={{ width: `${columnWidths.profit || 100}px` }}
                  >
                    <span className="text-xs text-green-400 font-medium whitespace-nowrap">
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
