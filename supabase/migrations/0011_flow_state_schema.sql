-- Omnirelay Phase 11: Conversation State Schema

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
