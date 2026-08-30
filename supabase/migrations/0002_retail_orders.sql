-- Omnirelay Phase 2: Retail Orders Schema

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
