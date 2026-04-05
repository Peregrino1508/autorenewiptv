import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, Trash2, Loader2, FileSpreadsheet, ChevronDown, ChevronUp, Palette, Calendar, Save, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  sheet_month: string;
  text_color?: string;
  created_at: string;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const COLORS = [
  { name: "Branco", value: "text-white" },
  { name: "Verde", value: "text-green-400" },
  { name: "Azul", value: "text-blue-400" },
  { name: "Amarelo", value: "text-yellow-400" },
  { name: "Vermelho", value: "text-red-400" },
  { name: "Roxo", value: "text-purple-400" },
  { name: "Turquesa", value: "text-cyan-400" },
];

interface SpreadsheetManagerProps {
  searchTerm?: string;
}

export function SpreadsheetManager({ searchTerm = "" }: SpreadsheetManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerRecord; direction: 'asc' | 'desc' } | null>(null);
  const [localRecords, setLocalRecords] = useState<CustomerRecord[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Excel-like navigation state
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Define editable columns in order for navigation
  const editableColumns: { key: keyof CustomerRecord; type: string }[] = [
    { key: "client_name", type: "text" },
    { key: "username", type: "text" },
    { key: "password", type: "text" },
    { key: "expiry_month", type: "text" },
    { key: "status", type: "text" },
    { key: "next_renewal", type: "date" },
    { key: "contact_number", type: "text" },
    { key: "value", type: "number" },
    { key: "expense", type: "number" },
    // profit is skipped in editable columns because it's calculated
    { key: "subscription_value", type: "number" },
    { key: "login_type", type: "text" }
  ];

  // Load settings
  const { data: settings } = useQuery({
    queryKey: ["spreadsheet-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spreadsheet_settings")
        .select("*")
        .eq("id", '00000000-0000-0000-0000-000000000000')
        .maybeSingle(); // Use maybeSingle to avoid errors if empty
      
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["customer-records", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_records")
        .select("*")
        .eq("sheet_month", selectedMonth);

      if (error) throw error;
      
      // Convert next_renewal from DB YYYY-MM-DD to frontend DD/MM/YYYY to perfectly match expiry_month behavior
      return (data as CustomerRecord[]).map(record => {
        if (record.next_renewal && record.next_renewal.includes("-")) {
          const parts = record.next_renewal.split("-");
          if (parts.length === 3) {
            record.next_renewal = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
        return record;
      });
    },
    refetchOnWindowFocus: false,
  });

  const availableMonths = useQuery({
    queryKey: ["available-months"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_records")
        .select("sheet_month")
        .not("sheet_month", "is", null);
      
      if (error) throw error;
      const uniqueMonths = Array.from(new Set((data as any[]).map(item => item.sheet_month)));
      
      // We no longer force the current month here so that deleted months stay visually gone
      return uniqueMonths.sort((a, b) => {
        const [monthA, yearA] = a.split(" ");
        const [monthB, yearB] = b.split(" ");
        if (yearA !== yearB) return yearA.localeCompare(yearB);
        return MONTHS.indexOf(monthA) - MONTHS.indexOf(monthB);
      });
    },
    refetchOnWindowFocus: false,
  });

  const settingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from("spreadsheet_settings")
        .update(newSettings)
        .eq("id", '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
  });

  // Apply settings on load
  useEffect(() => {
    if (settings) {
      if (settings.last_selected_month) setSelectedMonth(settings.last_selected_month);
      if (settings.sort_key && settings.sort_direction) {
        setSortConfig({ 
          key: settings.sort_key as keyof CustomerRecord, 
          direction: settings.sort_direction as 'asc' | 'desc' 
        });
      }
    }
  }, [settings]);

  // Handle global click outside to deselect cell
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // If clicking outside the table, clear selection
      const target = e.target as HTMLElement;
      if (!target.closest('.cursor-cell') && !target.closest('.lucide')) {
         // Only clearing edit mode, keeping active cell might be useful, 
         // but typical Excel clears or keeps it. Let's just exit edit mode.
         if (isEditing) {
           // We let the input onBlur handle it, or force it here
           setIsEditing(false);
         }
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);


  useEffect(() => {
    if (records) {
      setLocalRecords(records);
      setIsDirty(false);
    }
  }, [records]);

  const handleMonthChange = (month: string) => {
    if (isDirty) {
      if (!confirm("Você tem alterações não salvas. Deseja mudar de mês e perder as alterações?")) {
        return;
      }
    }
    setSelectedMonth(month);
    setIsDirty(false);
  };

  const handleSort = (key: keyof CustomerRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setIsDirty(true);
  };

  const handleSave = async () => {
    let recordsSuccess = false;
    let settingsError = null;

    try {
      setIsSaving(true);
      
      // Save records
      const recordsToSave = localRecords.map(r => {
        const { profit, ...data } = r;
        
        // Nullify empty dates strictly to avoid Postgres DATE syntax crashes "invalid input syntax for type date: """
        if (!data.next_renewal || data.next_renewal === "") {
           // Provide a real SQL null
           (data as any).next_renewal = null;
        } else if (data.next_renewal && data.next_renewal.includes("/")) {
          const parts = data.next_renewal.split("/");
          if (parts.length === 3) {
            data.next_renewal = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        
        return data;
      });

      for (const data of recordsToSave) {
        if (data.id.startsWith('temp-')) {
          const { id, ...insertData } = data;
          const { error } = await (supabase as any).from("customer_records").insert([{ ...insertData, created_by: user?.id }]);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("customer_records")
            .update(data)
            .eq("id", data.id);
          if (error) throw error;
        }
      }
      
      recordsSuccess = true;

      // Try to save settings separately
      try {
        await settingsMutation.mutateAsync({
          last_selected_month: selectedMonth,
          sort_key: sortConfig?.key,
          sort_direction: sortConfig?.direction
        });
      } catch (err: any) {
        console.error("Settings save error:", err);
        settingsError = err.message;
      }

      queryClient.invalidateQueries({ queryKey: ["customer-records"] });
      queryClient.invalidateQueries({ queryKey: ["available-months"] });
      setIsDirty(false);
      
      if (settingsError) {
        toast({ 
          title: "Parcialmente Salvo", 
          description: `Os registros foram salvos, mas houve um erro nas configurações: ${settingsError}. Verifique se a tabela 'spreadsheet_settings' existe no banco de dados.`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Sucesso", description: "Todas as alterações foram salvas!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Salvar",
        description: "Falha ao salvar registros: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('temp-')) {
        setLocalRecords(prev => prev.filter(r => r.id !== id));
        return;
      }
      const { error } = await (supabase as any)
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
    const newRow: CustomerRecord = {
      id: `temp-${Date.now()}`,
      client_name: "",
      username: "",
      password: "",
      expiry_month: "",
      status: "Ativo",
      next_renewal: new Date().toLocaleDateString('pt-BR'), // DD/MM/YYYY initially
      contact_number: "",
      value: 0,
      expense: 0,
      profit: 0,
      subscription_value: 0,
      login_type: "IPTV",
      sheet_month: selectedMonth,
      text_color: "text-white",
      created_at: new Date().toISOString(),
    };
    setLocalRecords(prev => [...prev, newRow]);
    setIsDirty(true);
  };

  const handleNewSheet = async () => {
    if (isDirty) {
      if (!confirm("Você tem alterações não salvas. Deseja criar uma nova planilha sem salvar as alterações atuais?")) {
        return;
      }
    }

    if (!localRecords || localRecords.length === 0) {
      toast({ title: "Aviso", description: "Não há registros no mês atual para clonar." });
      return;
    }

    const [monthName, yearStr] = selectedMonth.split(" ");
    const currentMonthIdx = MONTHS.indexOf(monthName);
    let nextMonthIdx = (currentMonthIdx + 1) % 12;
    let nextYear = parseInt(yearStr);
    if (nextMonthIdx === 0) nextYear++;
    
    const nextMonthName = `${MONTHS[nextMonthIdx]} ${nextYear}`;

    if (confirm(`Deseja gerar a planilha de ${nextMonthName}? Os valores serão zerados e as datas de renovação serão atualizadas.`)) {
      const newRecords = localRecords.map(({ id, created_at, profit, value, expense, status, expiry_month, next_renewal, ...rest }) => {
        // Erase next_renewal as requested, must be strictly null for Postgres DATE type syntax
        let cleanNextRenewal = null;
        
        // Must also safely preserve expiry_month in case the row originated with YYYY-MM-DD
        return {
          ...rest,
          value: 0,
          expense: 0,
          status: "",
          expiry_month: next_renewal, // receives previous original string
          next_renewal: cleanNextRenewal, // entirely cleared
          sheet_month: nextMonthName,
        };
      });

      const recordsWithOwner = newRecords.map((r: any) => ({ ...r, created_by: user?.id }));
      const { error } = await (supabase as any).from("customer_records").insert(recordsWithOwner);

      if (error) {
        toast({ title: "Erro", description: "Falha ao criar nova planilha: " + error.message, variant: "destructive" });
      } else {
        setSelectedMonth(nextMonthName);
        queryClient.invalidateQueries({ queryKey: ["customer-records"] });
        queryClient.invalidateQueries({ queryKey: ["available-months"] });
        toast({ title: "Sucesso", description: `Planilha de ${nextMonthName} criada!` });
      }
    }
  };

  const handleDeleteMonth = async () => {
    if (!confirm(`TEM CERTEZA que deseja excluir TODA a planilha de ${selectedMonth}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("customer_records")
        .delete()
        .eq("sheet_month", selectedMonth);

      if (error) throw error;

      toast({ title: "Sucesso", description: `Planilha de ${selectedMonth} excluída.` });
      
      // Fallback intelligently to the next highest available month if present, or clear completely
      queryClient.invalidateQueries({ queryKey: ["available-months"] }).then(() => {
        const cachedMonths = queryClient.getQueryData<string[]>(["available-months"]);
        const remaining = (cachedMonths || []).filter(m => m !== selectedMonth);
        if (remaining.length > 0) {
           setSelectedMonth(remaining[remaining.length - 1]); // Set to whatever is last/latest
        } else {
           // Completely empty system state
           const defaultMonth = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;
           setSelectedMonth(defaultMonth); 
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["customer-records"] });
    } catch (error: any) {
      toast({ title: "Erro", description: "Falha ao excluir mês: " + error.message, variant: "destructive" });
    }
  };

  // handleSort removed and replaced above

  const sortedRecords = [...localRecords].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal === undefined || bVal === undefined) return 0;
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const updateLocalRecord = (id: string, field: keyof CustomerRecord, value: any) => {
    setLocalRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updatedRecord = { ...r, [field]: value };
        if (field === 'value' || field === 'expense') {
          updatedRecord.profit = (Number(updatedRecord.value) || 0) - (Number(updatedRecord.expense) || 0);
        }
        return updatedRecord;
      }
      return r;
    }));
    setIsDirty(true);
  };

  const renderCell = (record: CustomerRecord, rowIndex: number, field: keyof CustomerRecord, type: string = "text") => {
    const isText = type === "text";
    const textColor = record.text_color || "text-white";
    
    // Find column index for navigation (returns -1 if it's the profit column which we skip in navigation)
    const colIndex = editableColumns.findIndex(c => c.key === field);
    
    const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
    const isCurrentlyEditing = isActive && isEditing;
    
    // Cell styling classes
    const baseClasses = `w-full h-8 flex items-center px-2 border-r border-white/10 ${textColor} relative transition-all duration-75`;
    const activeClasses = isActive ? "ring-2 ring-purple-500 bg-purple-500/20 z-10" : "";
    const displayValue = record[field];

    let dateInputValue = displayValue as string || "";
    if (type === "date" && dateInputValue.includes("/")) {
      const parts = dateInputValue.split("/");
      if (parts.length === 3) {
        // Assume DD/MM/YYYY -> YYYY-MM-DD
        dateInputValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const handleDateChange = (val: string) => {
      // Convert YYYY-MM-DD back to DD/MM/YYYY for both expiry_month and next_renewal exactly as requested
      if ((field === "expiry_month" || field === "next_renewal") && val && val.includes("-")) {
        const parts = val.split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return val;
    };

    return (
      <div 
        className={`${baseClasses} ${activeClasses} cursor-cell`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName.toLowerCase() === 'input' && (target as HTMLInputElement).type === 'date') {
            return; // completely ignore to prevent react rendering during native popup usage
          }
          if (colIndex !== -1) {
            if (activeCell?.row !== rowIndex || activeCell?.col !== colIndex) {
              setActiveCell({ row: rowIndex, col: colIndex });
              setIsEditing(false);
            }
          }
        }}
        onDoubleClick={() => {
           if (colIndex !== -1) {
             if (activeCell?.row !== rowIndex || activeCell?.col !== colIndex) {
               setActiveCell({ row: rowIndex, col: colIndex });
             }
             setIsEditing(true);
           }
        }}
      >
        {type === "date" ? (
          <Input
            type="date"
            value={dateInputValue}
            onChange={(e) => updateLocalRecord(record.id, field, handleDateChange(e.target.value))}
            className={`bg-transparent border-none focus:ring-0 w-full h-full text-xs ${textColor} px-2 cursor-pointer [color-scheme:dark]`}
            onFocus={(e) => {
              // Bypassed tracking activeCell on focus to prevent Chrome's native shadow DOM calendar from closing
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : isCurrentlyEditing ? (
          isText ? (
            <textarea
              autoFocus
              value={displayValue as string}
              onChange={(e) => updateLocalRecord(record.id, field, e.target.value)}
              onBlur={() => setIsEditing(false)}
              className={`absolute inset-0 bg-slate-800 border-none focus:ring-0 w-full h-full text-xs ${textColor} p-2 resize-none overflow-hidden z-20`}
              rows={1}
            />
          ) : (
            <Input
              autoFocus
              type={type}
              value={displayValue as any}
              onChange={(e) => {
                const val = type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
                updateLocalRecord(record.id, field, val);
              }}
              onBlur={() => setIsEditing(false)}
              className={`absolute inset-0 bg-slate-800 border-none focus:ring-0 w-full h-full text-xs ${textColor} p-1 md:p-2 z-20 rounded-none`}
            />
          )
        ) : (
          <div className="w-full truncate text-xs">
            {type === "number" ? Number(displayValue || 0).toString() : (displayValue as string)}
          </div>
        )}
      </div>
    );
  };

  const displayRecords = sortedRecords.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.client_name.toLowerCase().includes(search) ||
      record.username.toLowerCase().includes(search)
    );
  });

  // Handle global keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCell) return;

      // Abort if the user is focused on an external input (e.g., the global search bar)
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        // Only allow if it's our own cell input
        if (!activeEl.closest('.cursor-cell')) {
          return;
        }
      }

      // If we are currently editing a cell, let the input handle most keys
      if (isEditing) {
        if (e.key === "Escape") {
          setIsEditing(false);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          setIsEditing(false);
          // Move down on Enter like Excel
          if (activeCell.row < displayRecords.length - 1) {
            setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
          }
        }
        return;
      }

      // If not editing, handle navigation
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (activeCell.row > 0) {
            setActiveCell({ row: activeCell.row - 1, col: activeCell.col });
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (activeCell.row < displayRecords.length - 1) {
            setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (activeCell.col > 0) {
            setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (activeCell.col < editableColumns.length - 1) {
            setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
          }
          break;
        case "Enter":
          e.preventDefault();
          setIsEditing(true);
          break;
        case "Escape":
          setActiveCell(null);
          break;
        // If user starts typing alphanumeric characters, auto-start editing
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            setIsEditing(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, isEditing, displayRecords.length]);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  const renderHeader = (label: string, initialWidth: string, sortKey?: keyof CustomerRecord) => (
    <TableHead 
      className={`p-0 h-10 border-r border-white/10 text-slate-300 text-xs font-bold cursor-pointer hover:bg-white/5 transition-colors`}
      onClick={sortKey ? () => handleSort(sortKey) : undefined}
    >
      <div className={`flex items-center justify-between px-2 h-full overflow-hidden ${initialWidth}`}>
        <span>{label}</span>
        {sortKey && (
          <div className="flex flex-col ml-1">
            <ChevronUp className={`w-3 h-3 -mb-1 ${sortConfig?.key === sortKey && sortConfig.direction === 'asc' ? 'text-purple-400' : 'text-slate-600'}`} />
            <ChevronDown className={`w-3 h-3 ${sortConfig?.key === sortKey && sortConfig.direction === 'desc' ? 'text-purple-400' : 'text-slate-600'}`} />
          </div>
        )}
      </div>
    </TableHead>
  );

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            Cadastro de Usuários (Planilha)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-xs text-white">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {availableMonths.data?.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteMonth}
              className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
              title="Excluir este mês"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button 
              onClick={() => {
                if (records) setLocalRecords(records);
                setIsDirty(false);
              }} 
              variant="ghost" 
              className="text-slate-400 hover:text-white h-9 px-3 text-xs"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Descartar
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || isSaving}
            className={`${isDirty ? 'bg-purple-600 hover:bg-purple-700 animate-pulse' : 'bg-slate-700'} text-white h-9 px-3 text-xs`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          <Button onClick={handleNewSheet} variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 h-9 px-3 text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Nova Planilha
          </Button>
          <Button onClick={handleAddRow} className="bg-green-600 hover:bg-green-700 text-white h-9 px-3 text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Nova Linha
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-max border-collapse table-auto">
          <TableHeader className="bg-white/10">
            <TableRow className="border-white/10 h-10">
              {renderHeader("Cliente", "w-[250px]", "client_name")}
              {renderHeader("Usuário", "w-[180px]", "username")}
              {renderHeader("Senha", "w-[180px]", "password")}
              {renderHeader("Mês Venc.", "w-[120px]", "expiry_month")}
              {renderHeader("Status", "w-[100px]", "status")}
              {renderHeader("Próx. Renov.", "w-[140px]", "next_renewal")}
              {renderHeader("Contato", "w-[160px]", "contact_number")}
              {renderHeader("Valor", "w-[90px]", "value")}
              {renderHeader("Despesa", "w-[90px]", "expense")}
              {renderHeader("Lucro", "w-[100px]", "profit")}
              {renderHeader("Assinatura", "w-[100px]", "subscription_value")}
              {renderHeader("P2P/IPTV", "w-[100px]", "login_type")}
              <TableHead className="w-[80px] p-0"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRecords.map((record, idx) => (
              <TableRow key={record.id || `new-${idx}`} className={`border-white/5 hover:bg-white/5 transition-colors h-8 ${activeCell?.row === idx ? 'bg-white/5' : ''}`}>
                <TableCell className="p-0">{renderCell(record, idx, "client_name")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "username")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "password")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "expiry_month", "date")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "status")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "next_renewal", "date")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "contact_number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "value", "number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "expense", "number")}</TableCell>
                <TableCell className="p-0">
                  <div className="px-2 flex items-center h-8 border-r border-white/10 w-full bg-white/5 cursor-default">
                    <span className={`text-xs ${record.profit < 0 ? 'text-red-400' : 'text-green-400'} font-medium`}>
                      R$ {(record.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "subscription_value", "number")}</TableCell>
                <TableCell className="p-0">{renderCell(record, idx, "login_type")}</TableCell>
                <TableCell className="p-0">
                  <div className="flex items-center justify-center gap-1 h-8 w-[80px]">
                    {record.id && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white">
                            <Palette className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 bg-slate-900 border-white/10 p-2">
                          <div className="grid grid-cols-4 gap-2">
                            {COLORS.map((color) => (
                              <button
                                key={color.value}
                                className={`w-6 h-6 rounded-full border border-white/20 ${color.value.replace('text-', 'bg-')}`}
                                onClick={() => updateLocalRecord(record.id, 'text_color', color.value)}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
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
