-- Add pricing_id column to credit_packages table
ALTER TABLE public.credit_packages ADD COLUMN pricing_id TEXT;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN public.credit_packages.pricing_id IS 'Stripe price ID associated with this credit package';

-- Create an index for faster lookups by pricing_id
CREATE INDEX idx_credit_packages_pricing_id ON public.credit_packages(pricing_id);

-- Update the webhook function to use the pricing_id to find the package
CREATE OR REPLACE FUNCTION public.find_credit_package_by_pricing_id(p_pricing_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package_id UUID;
BEGIN
  -- Find the package ID based on the pricing ID
  SELECT id INTO v_package_id
  FROM public.credit_packages
  WHERE pricing_id = p_pricing_id;
  
  RETURN v_package_id;
END;
$$; 