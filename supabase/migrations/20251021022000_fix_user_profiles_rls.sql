-- ========================================
-- user_profiles テーブルのRLSポリシー修正
-- 無限再帰エラーの解消
-- ========================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 新しいポリシーを作成（auth.uid()を直接参照）
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- 確認用クエリ（結果を確認してください）
-- ========================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
