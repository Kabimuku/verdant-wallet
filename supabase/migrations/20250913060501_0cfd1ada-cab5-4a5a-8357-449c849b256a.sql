-- Add icon column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS icon text DEFAULT '📄';