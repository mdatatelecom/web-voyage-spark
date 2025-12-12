-- Create RLS policies for storage bucket 'public' to allow uploads

-- Allow authenticated users to upload files to public bucket
CREATE POLICY "Authenticated users can upload to public bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

-- Allow authenticated users to update their own files in public bucket
CREATE POLICY "Authenticated users can update public files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'public');

-- Allow authenticated users to delete files in public bucket
CREATE POLICY "Authenticated users can delete public files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'public');

-- Allow public read access for public bucket
CREATE POLICY "Public read access for public bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');