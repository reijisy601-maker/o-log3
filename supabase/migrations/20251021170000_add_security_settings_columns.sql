DO $$ 
BEGIN
  -- new_user_auth_code カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'security_settings' 
    AND column_name = 'new_user_auth_code'
  ) THEN
    ALTER TABLE public.security_settings 
    ADD COLUMN new_user_auth_code TEXT NOT NULL DEFAULT 'CHANGE_ME';
  END IF;

  -- allowed_domains カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'security_settings' 
    AND column_name = 'allowed_domains'
  ) THEN
    ALTER TABLE public.security_settings 
    ADD COLUMN allowed_domains TEXT[] NOT NULL DEFAULT ARRAY['example.com'];
  END IF;
END $$;

-- デフォルト値の更新
UPDATE public.security_settings
SET 
  new_user_auth_code = 'DEMO2024',
  allowed_domains = ARRAY['icloud.com', 'gmail.com', 'example.com']
WHERE id = 1;
