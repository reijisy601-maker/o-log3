-- Relax NOT NULL constraints for optional submission fields
ALTER TABLE public.submissions
  ALTER COLUMN luggage_image_url DROP NOT NULL,
  ALTER COLUMN toolbox_image_url DROP NOT NULL,
  ALTER COLUMN luggage_score DROP NOT NULL,
  ALTER COLUMN toolbox_score DROP NOT NULL,
  ALTER COLUMN luggage_feedback DROP NOT NULL,
  ALTER COLUMN toolbox_feedback DROP NOT NULL;
