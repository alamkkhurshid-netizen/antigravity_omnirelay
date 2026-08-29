-- Omnirelay Phase 2: Flow Engine Schema

-- 1. Flows Table
CREATE TABLE public.flows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status text CHECK (status IN ('draft', 'active', 'archived')) NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- 2. Flow Versions Table (Stores the actual nodes and edges state)
CREATE TABLE public.flow_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Flows Policies
CREATE POLICY "Users can view flows of their tenants"
  ON public.flows FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert flows to their tenants"
  ON public.flows FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update flows of their tenants"
  ON public.flows FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete flows of their tenants"
  ON public.flows FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Flow Versions Policies
-- We need to check if the user belongs to the tenant that owns the flow_id.
CREATE POLICY "Users can view flow versions of their tenants"
  ON public.flow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flows
      WHERE id = public.flow_versions.flow_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can insert flow versions to their tenants"
  ON public.flow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flows
      WHERE id = public.flow_versions.flow_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can update flow versions of their tenants"
  ON public.flow_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.flows
      WHERE id = public.flow_versions.flow_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can delete flow versions of their tenants"
  ON public.flow_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.flows
      WHERE id = public.flow_versions.flow_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );
