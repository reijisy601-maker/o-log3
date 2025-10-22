-- submissionsテーブルに2枚の画像URLカラムを追加
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS luggage_space_image_url TEXT,
ADD COLUMN IF NOT EXISTS tool_bag_image_url TEXT,
ADD COLUMN IF NOT EXISTS luggage_space_score INTEGER CHECK (luggage_space_score >= 0 AND luggage_space_score <= 98),
ADD COLUMN IF NOT EXISTS tool_bag_score INTEGER CHECK (tool_bag_score >= 0 AND tool_bag_score <= 98),
ADD COLUMN IF NOT EXISTS luggage_space_comment TEXT,
ADD COLUMN IF NOT EXISTS tool_bag_comment TEXT;

-- 既存のimage_urlカラムはluggage_space_image_urlに移行（既存データがある場合）
UPDATE submissions 
SET luggage_space_image_url = image_url 
WHERE luggage_space_image_url IS NULL AND image_url IS NOT NULL;

-- image_urlカラムをNULL許容に変更（後方互換性のため残す）
ALTER TABLE submissions ALTER COLUMN image_url DROP NOT NULL;

-- コメント追加
COMMENT ON COLUMN submissions.luggage_space_image_url IS 'ラゲッジスペースの画像URL';
COMMENT ON COLUMN submissions.tool_bag_image_url IS 'ツールバッグの画像URL';
COMMENT ON COLUMN submissions.luggage_space_score IS 'ラゲッジスペースのスコア（0-98点）';
COMMENT ON COLUMN submissions.tool_bag_score IS 'ツールバッグのスコア（0-98点）';
COMMENT ON COLUMN submissions.luggage_space_comment IS 'ラゲッジスペースの評価コメント';
COMMENT ON COLUMN submissions.tool_bag_comment IS 'ツールバッグの評価コメント';
