
-- Tabela de perfis de administradores
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver todos os perfis, admins regulares só o próprio
CREATE POLICY "Super admins can view all admin profiles"
ON public.admin_profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Apenas super admins podem inserir novos perfis
CREATE POLICY "Super admins can insert admin profiles"
ON public.admin_profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

-- Super admins podem atualizar/deletar
CREATE POLICY "Super admins can update admin profiles"
ON public.admin_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

CREATE POLICY "Super admins can delete admin profiles"
ON public.admin_profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
