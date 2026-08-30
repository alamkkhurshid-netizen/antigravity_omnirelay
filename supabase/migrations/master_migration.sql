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
-- Omnirelay Phase 4: CRM (Contacts & Messages) and Restaurant Bookings Schema

-- 1. Contacts Table
CREATE TABLE public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone_number text NOT NULL,
  name text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 2. Messages Table
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  content text NOT NULL,
  status text CHECK (status IN ('received', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'received',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Restaurant Bookings Table
CREATE TABLE public.restaurant_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  booking_date date NOT NULL,
  booking_time time without time zone NOT NULL,
  party_size integer NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.restaurant_bookings ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

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
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = public.messages.contact_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can insert messages to their tenants"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = public.messages.contact_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can update messages of their tenants"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = public.messages.contact_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

CREATE POLICY "Users can delete messages of their tenants"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = public.messages.contact_id
      AND public.user_belongs_to_tenant(tenant_id)
    )
  );

-- Restaurant Bookings Policies
CREATE POLICY "Users can view bookings of their tenants"
  ON public.restaurant_bookings FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert bookings to their tenants"
  ON public.restaurant_bookings FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update bookings of their tenants"
  ON public.restaurant_bookings FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete bookings of their tenants"
  ON public.restaurant_bookings FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
-- Omnirelay Phase 5: Clinic Vertical Schema

-- 1. Doctors Table
CREATE TABLE public.doctors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  specialty text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- 2. Clinic Appointments Table
CREATE TABLE public.clinic_appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Doctors Policies
CREATE POLICY "Users can view doctors of their tenants"
  ON public.doctors FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert doctors to their tenants"
  ON public.doctors FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update doctors of their tenants"
  ON public.doctors FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete doctors of their tenants"
  ON public.doctors FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Clinic Appointments Policies
CREATE POLICY "Users can view appointments of their tenants"
  ON public.clinic_appointments FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert appointments to their tenants"
  ON public.clinic_appointments FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update appointments of their tenants"
  ON public.clinic_appointments FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete appointments of their tenants"
  ON public.clinic_appointments FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
-- Omnirelay Phase 6: Retail Vertical Schema

-- 1. Retail Orders Table
CREATE TABLE public.retail_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  order_number text NOT NULL,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending' NOT NULL,
  shipping_status text CHECK (shipping_status IN ('processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'processing' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.retail_orders ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view retail orders of their tenants"
  ON public.retail_orders FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert retail orders to their tenants"
  ON public.retail_orders FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update retail orders of their tenants"
  ON public.retail_orders FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete retail orders of their tenants"
  ON public.retail_orders FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
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
-- Omnirelay Phase 8: Billing and Wallet Schema

-- 1. Tenant Subscriptions
CREATE TABLE public.tenant_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_name text CHECK (plan_name IN ('free', 'growth', 'pro')) DEFAULT 'free' NOT NULL,
  status text CHECK (status IN ('active', 'past_due', 'cancelled')) DEFAULT 'active' NOT NULL,
  razorpay_subscription_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Wallets (Prepaid messaging credits)
CREATE TABLE public.tenant_wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_inr numeric(10, 2) DEFAULT 0.00 NOT NULL,
  free_quota_remaining integer DEFAULT 500 NOT NULL, -- 500 free utility messages per month
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;

-- 3. Message Ledger (Tracking per-message costs)
CREATE TABLE public.message_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  channel text DEFAULT 'whatsapp' NOT NULL,
  category text CHECK (category IN ('utility', 'marketing', 'authentication', 'service')) NOT NULL,
  meta_cost_inr numeric(10, 4) NOT NULL,
  billed_cost_inr numeric(10, 4) NOT NULL, -- meta_cost + our margin
  status text CHECK (status IN ('deducted', 'quota_used', 'failed')) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.message_ledger ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Subscriptions Policies
CREATE POLICY "Users can view subscriptions of their tenants"
  ON public.tenant_subscriptions FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update subscriptions of their tenants"
  ON public.tenant_subscriptions FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Wallets Policies
CREATE POLICY "Users can view wallets of their tenants"
  ON public.tenant_wallets FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update wallets of their tenants"
  ON public.tenant_wallets FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

-- Ledger Policies
CREATE POLICY "Users can view ledger of their tenants"
  ON public.message_ledger FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

-- Note: We do not allow frontend inserts/updates to the ledger, this must be handled by backend/webhooks.

-- --------------------------------------------------------
-- TRIGGER TO AUTO-CREATE SUBSCRIPTION AND WALLET FOR NEW TENANTS
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_tenant_billing()
RETURNS trigger AS $$
BEGIN
  -- Create free tier subscription
  INSERT INTO public.tenant_subscriptions (tenant_id, plan_name)
  VALUES (new.id, 'free');

  -- Create empty wallet with 500 quota
  INSERT INTO public.tenant_wallets (tenant_id, balance_inr, free_quota_remaining)
  VALUES (new.id, 0.00, 500);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires AFTER insert on tenants table
CREATE TRIGGER on_tenant_created_billing
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_tenant_billing();

-- --------------------------------------------------------
-- SEED EXISTING TENANTS (For dev environment)
-- --------------------------------------------------------
INSERT INTO public.tenant_subscriptions (tenant_id, plan_name)
SELECT id, 'free' FROM public.tenants 
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.tenant_wallets (tenant_id, balance_inr, free_quota_remaining)
SELECT id, 0.00, 500 FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;
-- Omnirelay Growth Stage 1: RAG Knowledge Base Schema

-- 1. Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge Documents (Tracks the uploaded files)
CREATE TABLE public.knowledge_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  status text CHECK (status IN ('processing', 'ready', 'failed')) DEFAULT 'processing' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- 3. Document Chunks (Stores the actual text snippets and their embeddings)
CREATE TABLE public.document_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL, -- 1536 is the dimension for OpenAI's text-embedding-3-small
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- 4. Create an index for faster similarity searches
CREATE INDEX ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Create a function to search for documents (Cosine Similarity)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  target_tenant_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.tenant_id = target_tenant_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view documents of their tenants"
  ON public.knowledge_documents FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert documents to their tenants"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete documents of their tenants"
  ON public.knowledge_documents FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can view document chunks of their tenants"
  ON public.document_chunks FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert document chunks to their tenants"
  ON public.document_chunks FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete document chunks of their tenants"
  ON public.document_chunks FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
-- Omnirelay Growth Stage 2: Multichannel (Instagram DM) Schema Expansion

-- 1. Alter Contacts Table
-- We drop the NOT NULL constraint on phone_number because an Instagram-only contact won't have one initially
ALTER TABLE public.contacts ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE public.contacts ADD COLUMN instagram_id text;

-- Drop the old unique constraint (tenant_id, phone_number) and create a more flexible one
-- We will handle duplicate prevention at the application level if a contact merges channels
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_tenant_id_phone_number_key;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_tenant_phone_unique UNIQUE NULLS NOT DISTINCT (tenant_id, phone_number);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_tenant_ig_unique UNIQUE NULLS NOT DISTINCT (tenant_id, instagram_id);

-- 2. Alter Messages Table
-- Add a channel column so the inbox knows where the message came from
ALTER TABLE public.messages ADD COLUMN channel text CHECK (channel IN ('whatsapp', 'instagram')) DEFAULT 'whatsapp' NOT NULL;
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

-- --------------------------------------------------------
-- Omnirelay Phase 2: Retail Orders Schema
-- --------------------------------------------------------

CREATE TABLE public.retail_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_phone text NOT NULL,
  order_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_amount numeric(10, 2) DEFAULT 0.00,
  status text CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')) NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.retail_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their tenant retail orders"
  ON public.retail_orders FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert retail orders for their tenant"
  ON public.retail_orders FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update their tenant retail orders"
  ON public.retail_orders FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

-- --------------------------------------------------------
-- Omnirelay Phase 11: Conversation State Schema
-- --------------------------------------------------------

CREATE TABLE public.conversation_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active_flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  current_node_id text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view conversation states of their tenants"
  ON public.conversation_states FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert conversation states to their tenants"
  ON public.conversation_states FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update conversation states of their tenants"
  ON public.conversation_states FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete conversation states of their tenants"
  ON public.conversation_states FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
