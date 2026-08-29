-- Omnirelay Phase 7: WhatsApp Broadcasts Schema

-- 1. Broadcast Campaigns Table
CREATE TABLE public.broadcast_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template_name text NOT NULL,
  status text CHECK (status IN ('draft', 'sending', 'sent', 'failed')) DEFAULT 'draft' NOT NULL,
  sent_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view broadcasts of their tenants"
  ON public.broadcast_campaigns FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert broadcasts to their tenants"
  ON public.broadcast_campaigns FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update broadcasts of their tenants"
  ON public.broadcast_campaigns FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete broadcasts of their tenants"
  ON public.broadcast_campaigns FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
