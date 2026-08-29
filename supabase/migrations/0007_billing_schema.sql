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
