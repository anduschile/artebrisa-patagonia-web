-- Add is_active column to core_units with default true
ALTER TABLE core_units ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Deactivate CAB-1 and CAB-2 test units
UPDATE core_units SET is_active = false WHERE code IN ('CAB-1', 'CAB-2');
