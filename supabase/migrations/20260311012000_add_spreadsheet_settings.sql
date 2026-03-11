-- Create spreadsheet_settings table
CREATE TABLE public.spreadsheet_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_selected_month TEXT,
    sort_key TEXT,
    sort_direction TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spreadsheet_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins
CREATE POLICY "Admins can manage spreadsheet settings"
ON public.spreadsheet_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings if not exists
INSERT INTO public.spreadsheet_settings (id, last_selected_month, sort_key, sort_direction)
VALUES ('00000000-0000-0000-0000-000000000000', NULL, 'created_at', 'desc')
ON CONFLICT (id) DO NOTHING;
