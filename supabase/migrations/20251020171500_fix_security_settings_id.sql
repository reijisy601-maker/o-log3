-- 既存のテーブルを削除して再作成
DROP TABLE IF EXISTS security_settings CASCADE;

-- security_settingsテーブルを再作成（id を integer に変更）
CREATE TABLE security_settings (
  id integer PRIMARY KEY DEFAULT 1,
  allowed_domains text[],
  registration_code text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- RLSを有効化
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- シンプルなポリシー：認証されたユーザー全員が閲覧可能
CREATE POLICY "Anyone can read security settings"
ON security_settings
FOR SELECT
USING (true);

-- 管理者のみ更新可能（user_profilesを参照するが、SELECTポリシーとは別なので無限再帰しない）
CREATE POLICY "Only admins can update security settings"
ON security_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 初期データを挿入
INSERT INTO security_settings (id, registration_code, allowed_domains)
VALUES (1, '1234', NULL)
ON CONFLICT (id) DO UPDATE
SET registration_code = '1234';

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER security_settings_updated_at
BEFORE UPDATE ON security_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
