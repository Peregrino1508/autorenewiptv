-- Adicionar colunas para gestão mensal e personalização visual na planilha de clientes
ALTER TABLE public.customer_records ADD COLUMN IF NOT EXISTS sheet_month TEXT;
ALTER TABLE public.customer_records ADD COLUMN IF NOT EXISTS text_color TEXT;

-- Marcar registros existentes com o mês atual para evitar que fiquem órfãos
-- Usando formatacao "Mês Ano" (Ex: Março 2026)
UPDATE public.customer_records SET sheet_month = 'Março 2026' WHERE sheet_month IS NULL;
