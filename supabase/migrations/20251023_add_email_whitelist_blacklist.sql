-- ====================================================================
-- security_settings に例外許可/拒否メールアドレス機能を追加
-- ====================================================================

-- STEP 1: カラム追加
ALTER TABLE public.security_settings
ADD COLUMN IF NOT EXISTS whitelisted_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS blacklisted_emails TEXT[] DEFAULT ARRAY[]::TEXT[];

-- STEP 2: カラムにコメント追加
COMMENT ON COLUMN public.security_settings.whitelisted_emails 
IS '例外的に許可するメールアドレスのリスト（ドメイン制限を無視）';

COMMENT ON COLUMN public.security_settings.blacklisted_emails 
IS '登録・ログインを拒否するメールアドレスのリスト（ブロックリスト）';

-- STEP 3: インデックス追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_security_settings_whitelisted 
ON public.security_settings USING GIN (whitelisted_emails);

CREATE INDEX IF NOT EXISTS idx_security_settings_blacklisted 
ON public.security_settings USING GIN (blacklisted_emails);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✓ whitelisted_emails カラムを追加しました';
  RAISE NOTICE '✓ blacklisted_emails カラムを追加しました';
  RAISE NOTICE '✓ 管理者ページから設定可能です';
END $$;
