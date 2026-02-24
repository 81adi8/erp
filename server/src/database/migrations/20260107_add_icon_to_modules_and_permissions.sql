-- Add icon column to modules and permissions tables
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS icon TEXT;

-- Update existing records if needed (optional)
-- UPDATE public.modules SET icon = 'Folder' WHERE icon IS NULL;
-- UPDATE public.permissions SET icon = 'Shield' WHERE icon IS NULL;
