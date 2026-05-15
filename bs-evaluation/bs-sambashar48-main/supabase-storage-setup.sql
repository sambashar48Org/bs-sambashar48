-- B.S Evaluation - Supabase Storage Setup
-- Run this in Supabase SQL Editor to create the storage bucket and policies for evaluation images

-- Create storage bucket for building evaluation images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evaluation-images',
  'evaluation-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for evaluation-images bucket

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'evaluation-images' AND (storage.foldername(name))[1] = 'uploads');

-- Allow public read access to all images in the bucket
CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'evaluation-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (bucket_id = 'evaluation-images');
