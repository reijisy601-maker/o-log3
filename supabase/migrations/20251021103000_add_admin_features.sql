-- supabase/migrations/20251021103000_add_admin_features.sql
-- Adds admin-facing columns and performance indexes for Phase 2 features

-- user_profilesテーブルに2カラム追加
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_submissions_user_year_month ON submissions(user_id, year_month);
