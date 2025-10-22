-- Ensure submissions table has all required columns
DO $$
BEGIN
  -- luggage_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'luggage_score'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN luggage_score INTEGER;
  END IF;

  -- toolbox_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'toolbox_score'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN toolbox_score INTEGER;
  END IF;

  -- luggage_feedback
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'luggage_feedback'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN luggage_feedback TEXT;
  END IF;

  -- toolbox_feedback
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'toolbox_feedback'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN toolbox_feedback TEXT;
  END IF;

  -- image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN image_url TEXT;
  END IF;

  -- luggage_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'luggage_image_url'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN luggage_image_url TEXT;
  END IF;

  -- toolbox_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'toolbox_image_url'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN toolbox_image_url TEXT;
  END IF;
END $$;
