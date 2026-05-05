-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  price TEXT NOT NULL,
  status TEXT CHECK (status IN ('sale', 'lease', 'rent')) NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON properties
  FOR SELECT USING (true);

-- Allow authenticated users (admin) full access
CREATE POLICY "Allow admin full access" ON properties
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true);

-- Allow public access to images bucket
CREATE POLICY "Give public access" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Create admin user (REPLACE WITH YOUR EMAIL - run this after setting up auth)
-- Go to Authentication > Users > Add User
-- Email: admin@loftycresthomes.com
-- Password: create a strong password
-- Then confirm email if needed.

-- For sitemap and robots (add these files to your hosting)
-- Create sitemap.xml with dynamic property URLs or use this template