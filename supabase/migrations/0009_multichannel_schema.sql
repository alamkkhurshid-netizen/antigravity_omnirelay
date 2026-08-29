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
