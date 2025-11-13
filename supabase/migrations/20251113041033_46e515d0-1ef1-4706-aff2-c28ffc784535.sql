-- Step 2: Create RLS policies for network_viewer role
CREATE POLICY "Network viewers can view connections they scanned"
ON public.connections
FOR SELECT
USING (
  has_role(auth.uid(), 'network_viewer'::user_role) AND
  id IN (
    SELECT connection_id 
    FROM public.access_logs 
    WHERE user_id = auth.uid() 
    AND action = 'qr_scanned'
  )
);

-- Update access_logs policies to allow network_viewers to view their own logs
CREATE POLICY "Network viewers can view their own scan logs"
ON public.access_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'network_viewer'::user_role) AND
  user_id = auth.uid() AND
  action = 'qr_scanned'
);