
-- Table to store per-admin Mercado Pago credentials
create table public.admin_mp_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mp_public_key text,
  mp_access_token text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.admin_mp_credentials enable row level security;

-- Admins can only manage their own credentials
create policy "Admins can manage own mp credentials"
on public.admin_mp_credentials
for all
to authenticated
using (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'));

-- Add admin_id to payments to track which admin's credentials to use
alter table public.payments add column admin_id uuid;
