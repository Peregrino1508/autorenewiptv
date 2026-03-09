-- Criar tabela para extratos mensais
CREATE TABLE public.monthly_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_payments INTEGER NOT NULL DEFAULT 0,
  renewed_plans INTEGER NOT NULL DEFAULT 0,
  total_expenses NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(month, year)
);

-- Habilitar RLS
ALTER TABLE public.monthly_statements ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem extratos
CREATE POLICY "Admins can manage monthly statements"
ON public.monthly_statements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_monthly_statements_updated_at
BEFORE UPDATE ON public.monthly_statements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();