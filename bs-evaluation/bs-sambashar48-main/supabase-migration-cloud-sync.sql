-- B.S Evaluation — Migration: Add cloud_sync_enabled to users
-- Run this in Supabase SQL Editor to add the new column

-- Add cloud_sync_enabled column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS cloud_sync_enabled BOOLEAN NOT NULL DEFAULT false;

-- Admin users automatically have cloud access via their role,
-- so no need to set cloud_sync_enabled=true for admins.
-- This column is only relevant for 'user' role accounts.
