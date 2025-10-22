-- security_settingsテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view security settings" ON security_settings;
DROP POLICY IF EXISTS "Admins can update security settings" ON security_settings;
DROP POLICY IF EXISTS "Allow read access to security settings" ON security_settings;

-- 認証されたユーザーは閲覧可能（無限再帰を避けるためuser_profilesを参照しない）
CREATE POLICY "Authenticated users can read security settings"
ON security_settings
FOR SELECT
TO authenticated
USING (true);

-- 管理者のみ更新可能（auth.uid()を直接使用）
CREATE POLICY "Admins can update security settings"
ON security_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 認証コードのデータが存在しない場合は作成
INSERT INTO security_settings (registration_code, allowed_domains)
SELECT '1234', NULL
WHERE NOT EXISTS (SELECT 1 FROM security_settings);

-- 既存レコードを最新の値で更新
UPDATE security_settings
SET registration_code = '1234'
WHERE registration_code IS DISTINCT FROM '1234';
