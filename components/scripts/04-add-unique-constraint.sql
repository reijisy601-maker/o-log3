-- 既存のユニーク制約を確認（既に存在する場合はスキップ）
-- submissionsテーブルに user_id と month のユニーク制約が既に存在するため、
-- このスクリプトは確認用です。

-- 既存データで同じユーザー・同じ月の重複がある場合は、最新のものを残して削除
DELETE FROM submissions a
USING submissions b
WHERE a.user_id = b.user_id
  AND a.month = b.month
  AND a.created_at < b.created_at;

-- ユニーク制約が存在することを確認
-- 01-create-tables.sql で既に CONSTRAINT unique_user_month UNIQUE (user_id, month) が定義されています
