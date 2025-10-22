-- Ensure submissions table supports upsert by (user_id, year_month)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.submissions
      ADD COLUMN email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'submissions'
      AND indexname = 'idx_submissions_user_year_month'
  ) THEN
    CREATE UNIQUE INDEX idx_submissions_user_year_month
      ON public.submissions(user_id, year_month);
  END IF;
END $$;
