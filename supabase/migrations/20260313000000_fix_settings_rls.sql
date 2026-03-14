-- Migration: 20260313000000_fix_settings_rls.sql
-- Description: Endurece as políticas RLS da tabela settings para evitar acesso público a funções administrativas.

-- 1. Remove a política insegura que permite acesso total às configurações.
DROP POLICY IF EXISTS "Service role manages settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;

-- 2. Garante que o RLS está ativado na tabela.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Cria uma política de Leitura Pública (necessária para exibir infos no checkout)
CREATE POLICY "Anyone can read settings"
ON public.settings
FOR SELECT
USING (true);

-- 4. Cria políticas restritas de INSERT, UPDATE e DELETE apenas para usuários autenticados
-- Nota: Aqui estamos assumindo que qualquer usuário autenticado com um UUID é um admin válido (baseado no contexto atual do projeto Supabase/Lovable).
CREATE POLICY "Authenticated users can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update settings"
ON public.settings
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete settings"
ON public.settings
FOR DELETE
USING (auth.uid() IS NOT NULL);
