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
