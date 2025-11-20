-- Add RLS policies for viewer role to match network_viewer behavior

-- Policy for viewer to view connections they scanned
CREATE POLICY "Viewers can view connections they scanned"
ON public.connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'viewer'::user_role) 
  AND id IN (
    SELECT connection_id 
    FROM public.access_logs 
    WHERE user_id = auth.uid() 
    AND action = 'qr_scanned'
  )
);

-- Policy for viewer to view their own scan logs
CREATE POLICY "Viewers can view their own scan logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'viewer'::user_role) 
  AND user_id = auth.uid() 
  AND action = 'qr_scanned'
);

-- Policy for viewer to insert their own scan logs
CREATE POLICY "Viewers can insert their own scan logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'viewer'::user_role)
  AND user_id = auth.uid()
);