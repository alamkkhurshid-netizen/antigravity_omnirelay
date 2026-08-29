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
