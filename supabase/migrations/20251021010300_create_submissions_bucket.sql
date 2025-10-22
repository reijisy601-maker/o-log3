-- submissionsバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- ユーザーが自分の画像をアップロードできるポリシー
CREATE POLICY "Users can upload their own submission images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ユーザーが自分の画像を閲覧できるポリシー
CREATE POLICY "Users can view their own submission images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ユーザーが自分の画像を更新できるポリシー
CREATE POLICY "Users can update their own submission images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ユーザーが自分の画像を削除できるポリシー
CREATE POLICY "Users can delete their own submission images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
