-- Add reminder_sent flag to track proactive cron reminders
ALTER TABLE public.clinic_appointments
ADD COLUMN reminder_sent boolean DEFAULT false NOT NULL;
