-- Omnirelay Phase 0: Initial Multi-Tenant Schema

-- 1. Tenants Table
CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Members (Linking Supabase Auth to Tenants)
-- Note: Requires users to exist in auth.users
CREATE TABLE public.tenant_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'admin', 'agent')) NOT NULL DEFAULT 'agent',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 3. Contacts Table (End-users messaging via WhatsApp/Instagram)
CREATE TABLE public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text,
  phone_number text, -- E.164 format
  channel text DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'instagram', 'rcs')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, phone_number, channel)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 4. Messages Table (Conversation Ledger)
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  content jsonb NOT NULL, -- Flexible structure for text, templates, media
  category text CHECK (category IN ('utility', 'marketing', 'service', 'authentication', 'standard')),
  status text DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  external_id text, -- Meta Message ID
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Helper function to check if the current user belongs to a tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = tenant_uuid
    AND user_id = auth.uid()
  );
$$;

-- Tenants Policies
CREATE POLICY "Users can view their own tenants"
  ON public.tenants FOR SELECT
  USING (public.user_belongs_to_tenant(id));

-- Tenant Members Policies
CREATE POLICY "Users can view members of their tenants"
  ON public.tenant_members FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

-- Contacts Policies
CREATE POLICY "Users can view contacts of their tenants"
  ON public.contacts FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert contacts to their tenants"
  ON public.contacts FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update contacts of their tenants"
  ON public.contacts FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete contacts of their tenants"
  ON public.contacts FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Messages Policies
CREATE POLICY "Users can view messages of their tenants"
  ON public.messages FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert messages to their tenants"
  ON public.messages FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update messages of their tenants"
  ON public.messages FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Typically, we don't allow deleting messages to maintain a ledger, but for MVP:
CREATE POLICY "Users can delete messages of their tenants"
  ON public.messages FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
