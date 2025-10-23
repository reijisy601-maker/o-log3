-- ====================================================================
-- submissions バケットをパブリックに変更
-- ====================================================================

-- STEP 1: 既存のバケット設定を更新
UPDATE storage.buckets
SET public = true
WHERE id = 'submissions';

-- STEP 2: 既存のストレージポリシーを削除
DROP POLICY IF EXISTS "Users can view their own submission images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own submission images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own submission images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own submission images" ON storage.objects;

-- STEP 3: パブリック読み取り用のポリシーを作成
-- 認証済みユーザーは誰でも submissions バケット内の画像を閲覧可能
CREATE POLICY "Authenticated users can view submission images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'submissions');

-- STEP 4: アップロード・更新・削除は自分のフォルダのみ
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✓ submissions バケットがパブリック設定に変更されました';
  RAISE NOTICE '✓ 認証済みユーザーは全ての画像を閲覧可能です';
  RAISE NOTICE '✓ アップロード/更新/削除は自分のフォルダのみ可能です';
END $$;
