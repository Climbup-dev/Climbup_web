-- ================================================================
-- CLIMBUP - SEPARATE SHARED REQUESTS & ACCEPT TO GOOGLE DRIVE FIX
-- Supabase Dashboard → SQL Editor → Paste → Run
-- ================================================================

-- 1. Add status, sender_name, and original_resource_id columns if they don't exist
ALTER TABLE public.student_resources 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted',
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS original_resource_id UUID;

-- Set existing NULL status rows to 'accepted'
UPDATE public.student_resources 
SET status = 'accepted' 
WHERE status IS NULL;

-- 2. Drop old function
DROP FUNCTION IF EXISTS public.share_student_resource(UUID, UUID, TEXT);

-- 3. Recreate share_student_resource function
-- Sets status = 'pending' and saves sender_name + original_resource_id
CREATE FUNCTION public.share_student_resource(
  p_resource_id UUID,
  p_target_user_id UUID,
  p_sender_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource RECORD;
  v_new_id UUID;
  v_auth_exists BOOLEAN;
BEGIN
  -- Target user exists check
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_target_user_id) INTO v_auth_exists;
  IF NOT v_auth_exists THEN
    RETURN json_build_object('success', false, 'error', 'Target user no longer exists.');
  END IF;

  -- Fetch original resource
  SELECT * INTO v_resource FROM public.student_resources WHERE id = p_resource_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found.');
  END IF;

  -- Duplicate check (pending or accepted)
  IF EXISTS (
    SELECT 1 FROM public.student_resources
    WHERE user_id = p_target_user_id AND file_url = v_resource.file_url
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already shared with this user.');
  END IF;

  -- Insert pending share request for target user
  INSERT INTO public.student_resources (
    user_id,
    subject_id,
    type,
    title,
    file_url,
    status,
    sender_name,
    original_resource_id
  ) VALUES (
    p_target_user_id,
    v_resource.subject_id,
    COALESCE(v_resource.type, 'assignment'),
    v_resource.title,
    v_resource.file_url,
    'pending',
    p_sender_name,
    p_resource_id
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'new_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.share_student_resource(UUID, UUID, TEXT) TO authenticated;

-- ================================================================
-- SUCCESS!
-- ================================================================
