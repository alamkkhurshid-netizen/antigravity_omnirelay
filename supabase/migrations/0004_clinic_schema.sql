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
