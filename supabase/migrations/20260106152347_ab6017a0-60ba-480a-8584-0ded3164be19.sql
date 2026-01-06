-- Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for contracts bucket

-- Super admins can upload/manage contracts
CREATE POLICY "Super admins can manage contracts"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'contracts' 
  AND public.is_super_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'contracts' 
  AND public.is_super_admin(auth.uid())
);

-- Users can view their own contracts
CREATE POLICY "Users can view their own contracts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contracts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);