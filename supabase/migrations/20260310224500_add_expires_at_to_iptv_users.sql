-- Adicionar coluna expires_at na tabela iptv_users para rastrear a validade da assinatura
ALTER TABLE public.iptv_users ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
