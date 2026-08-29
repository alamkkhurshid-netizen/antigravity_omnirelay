-- Omnirelay Growth Stage 3: Developer API Keys Schema

CREATE TABLE public.tenant_api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE, -- For MVP we will store the raw key here, but rename it key_hash so we remember to hash it later
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view api keys of their tenants"
  ON public.tenant_api_keys FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert api keys to their tenants"
  ON public.tenant_api_keys FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete api keys of their tenants"
  ON public.tenant_api_keys FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
