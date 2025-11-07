-- Migration: Add payment tracking and atomic credit operations
-- Purpose: Prevent duplicate payment processing and race conditions
-- Date: 2025-11-05

-- ============================================================================
-- PART 1: Create table to track processed Stripe payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.processed_stripe_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text NULL,
  user_id uuid NOT NULL,
  credits_added integer NOT NULL,
  amount_total integer NULL, -- in cents
  currency text NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,

  CONSTRAINT processed_stripe_payments_pkey PRIMARY KEY (id),
  CONSTRAINT processed_stripe_payments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);

-- Index for fast lookups by session_id (main idempotency check)
CREATE INDEX IF NOT EXISTS idx_processed_payments_session_id
  ON public.processed_stripe_payments USING btree (stripe_session_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_processed_payments_user_id
  ON public.processed_stripe_payments USING btree (user_id);

-- Index for payment intent lookups
CREATE INDEX IF NOT EXISTS idx_processed_payments_payment_intent
  ON public.processed_stripe_payments USING btree (stripe_payment_intent_id);

COMMENT ON TABLE public.processed_stripe_payments IS
  'Tracks all processed Stripe payments to prevent duplicate credit additions from webhook retries';

COMMENT ON COLUMN public.processed_stripe_payments.stripe_session_id IS
  'Unique Stripe checkout session ID - used for idempotency checks';

-- ============================================================================
-- PART 2: Create atomic credit operation functions
-- ============================================================================

-- Function: Atomically add credits to a user
-- This prevents race conditions when multiple webhooks arrive simultaneously
CREATE OR REPLACE FUNCTION public.atomic_add_credits(
  p_user_id uuid,
  p_credits_to_add integer,
  p_grant_access boolean DEFAULT true
)
RETURNS TABLE(
  old_balance integer,
  new_balance integer,
  credits_added integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance integer;
  v_new_balance integer;
BEGIN
  -- Validate input
  IF p_credits_to_add <= 0 THEN
    RAISE EXCEPTION 'Credits to add must be positive, got: %', p_credits_to_add;
  END IF;

  -- Use SELECT ... FOR UPDATE to lock the row and prevent race conditions
  -- This ensures only one transaction can modify this user's credits at a time
  SELECT tokens INTO v_old_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Calculate new balance
  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance + p_credits_to_add;

  -- Update the user's credits atomically
  UPDATE public.users
  SET
    tokens = v_new_balance,
    has_access = CASE WHEN p_grant_access THEN true ELSE has_access END
  WHERE id = p_user_id;

  -- Return the results
  RETURN QUERY SELECT v_old_balance, v_new_balance, p_credits_to_add;
END;
$$;

COMMENT ON FUNCTION public.atomic_add_credits IS
  'Atomically adds credits to a user account with row-level locking to prevent race conditions';

-- Function: Atomically deduct credits from a user
-- Used when accepting tutoring sessions
CREATE OR REPLACE FUNCTION public.atomic_deduct_credits(
  p_user_id uuid,
  p_credits_to_deduct integer,
  p_allow_negative boolean DEFAULT false
)
RETURNS TABLE(
  success boolean,
  old_balance integer,
  new_balance integer,
  credits_deducted integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance integer;
  v_new_balance integer;
BEGIN
  -- Validate input
  IF p_credits_to_deduct <= 0 THEN
    RETURN QUERY SELECT
      false,
      0,
      0,
      0,
      format('Credits to deduct must be positive, got: %s', p_credits_to_deduct);
    RETURN;
  END IF;

  -- Lock the user row to prevent race conditions
  SELECT tokens INTO v_old_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      0,
      0,
      0,
      format('User not found: %s', p_user_id);
    RETURN;
  END IF;

  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance - p_credits_to_deduct;

  -- Check if user has enough credits
  IF v_new_balance < 0 AND NOT p_allow_negative THEN
    RETURN QUERY SELECT
      false,
      v_old_balance,
      v_old_balance,
      0,
      format('Insufficient credits. Required: %s, Available: %s', p_credits_to_deduct, v_old_balance);
    RETURN;
  END IF;

  -- Deduct the credits
  UPDATE public.users
  SET tokens = v_new_balance
  WHERE id = p_user_id;

  -- Return success
  RETURN QUERY SELECT
    true,
    v_old_balance,
    v_new_balance,
    p_credits_to_deduct,
    NULL::text;
END;
$$;

COMMENT ON FUNCTION public.atomic_deduct_credits IS
  'Atomically deducts credits from a user account with validation and row-level locking';

-- Function: Atomically transfer credits between users
-- Used for tutor credit requests
CREATE OR REPLACE FUNCTION public.atomic_transfer_credits(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_credits integer
)
RETURNS TABLE(
  success boolean,
  from_old_balance integer,
  from_new_balance integer,
  to_old_balance integer,
  to_new_balance integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_old integer;
  v_from_new integer;
  v_to_old integer;
  v_to_new integer;
BEGIN
  -- Validate input
  IF p_credits <= 0 THEN
    RETURN QUERY SELECT
      false, 0, 0, 0, 0,
      format('Transfer amount must be positive, got: %s', p_credits);
    RETURN;
  END IF;

  -- Lock both users in consistent order (by UUID) to prevent deadlocks
  IF p_from_user_id < p_to_user_id THEN
    SELECT tokens INTO v_from_old FROM public.users WHERE id = p_from_user_id FOR UPDATE;
    SELECT tokens INTO v_to_old FROM public.users WHERE id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT tokens INTO v_to_old FROM public.users WHERE id = p_to_user_id FOR UPDATE;
    SELECT tokens INTO v_from_old FROM public.users WHERE id = p_from_user_id FOR UPDATE;
  END IF;

  -- Check both users exist
  IF v_from_old IS NULL THEN
    RETURN QUERY SELECT
      false, 0, 0, 0, 0,
      format('Source user not found: %s', p_from_user_id);
    RETURN;
  END IF;

  IF v_to_old IS NULL THEN
    RETURN QUERY SELECT
      false, 0, 0, 0, 0,
      format('Destination user not found: %s', p_to_user_id);
    RETURN;
  END IF;

  v_from_old := COALESCE(v_from_old, 0);
  v_to_old := COALESCE(v_to_old, 0);

  -- Check sufficient balance
  IF v_from_old < p_credits THEN
    RETURN QUERY SELECT
      false, v_from_old, v_from_old, v_to_old, v_to_old,
      format('Insufficient credits. Required: %s, Available: %s', p_credits, v_from_old);
    RETURN;
  END IF;

  -- Calculate new balances
  v_from_new := v_from_old - p_credits;
  v_to_new := v_to_old + p_credits;

  -- Perform atomic transfer
  UPDATE public.users SET tokens = v_from_new WHERE id = p_from_user_id;
  UPDATE public.users SET tokens = v_to_new WHERE id = p_to_user_id;

  -- Return success
  RETURN QUERY SELECT
    true,
    v_from_old,
    v_from_new,
    v_to_old,
    v_to_new,
    NULL::text;
END;
$$;

COMMENT ON FUNCTION public.atomic_transfer_credits IS
  'Atomically transfers credits between two users with deadlock prevention and validation';

-- ============================================================================
-- PART 3: Grant necessary permissions
-- ============================================================================

-- Allow service role to use these functions
GRANT EXECUTE ON FUNCTION public.atomic_add_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_deduct_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_transfer_credits TO service_role;

-- Allow authenticated users to read payment history (but not modify)
GRANT SELECT ON public.processed_stripe_payments TO authenticated;
GRANT ALL ON public.processed_stripe_payments TO service_role;

-- ============================================================================
-- PART 4: Add indexes for performance
-- ============================================================================

-- Ensure users.tokens has an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_tokens
  ON public.users USING btree (tokens)
  WHERE tokens IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '   - Created processed_stripe_payments table';
  RAISE NOTICE '   - Created atomic_add_credits function';
  RAISE NOTICE '   - Created atomic_deduct_credits function';
  RAISE NOTICE '   - Created atomic_transfer_credits function';
  RAISE NOTICE '   - Added necessary indexes and permissions';
END $$;
