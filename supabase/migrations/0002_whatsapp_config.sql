-- Omnirelay Phase 3: WhatsApp Configuration Schema

CREATE TABLE public.tenant_whatsapp_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  waba_id text,
  phone_number_id text,
  access_token text,
  system_user_token text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_whatsapp_configs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view whatsapp config of their tenants"
  ON public.tenant_whatsapp_configs FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert whatsapp config to their tenants"
  ON public.tenant_whatsapp_configs FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update whatsapp config of their tenants"
  ON public.tenant_whatsapp_configs FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete whatsapp config of their tenants"
  ON public.tenant_whatsapp_configs FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
