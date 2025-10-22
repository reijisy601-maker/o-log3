# 🚀 OrderLog - 新規CLI Codexセッション立ち上げガイド

## 📌 前提条件

このガイドは、**現在のセッションで発生している問題を解決するため、新しいCLI Codexセッションを立ち上げる際の完全手順**です。

---

## 🎯 現在の問題概要

### 症状
- Magic Linkクリック後、`/login`にリダイレクトされる
- コールバックログ（`=== Auth Callback 開始 ===`）が出力されない
- URL: `/?code=...` → `/login`（本来は `/auth/callback` → `/admin`）

### 根本原因
**Supabase Dashboard の Redirect URLs 設定が不足**

---

## 📋 新規セッション立ち上げ手順

### ステップ1: セットアップスクリプトの取得

新しいCLI Codexセッションで以下を実行:

```bash
# セットアップスクリプトをダウンロード
curl -o orderlog-setup.sh [セットアップファイルのURL]

# 実行権限付与
chmod +x orderlog-setup.sh

# セットアップ実行
./orderlog-setup.sh
```

**または、AI Driveから取得:**

```bash
# AI Driveにアップロード済みの場合
cp /mnt/aidrive/orderlog/orderlog-setup-v2.sh ./
chmod +x orderlog-setup-v2.sh
./orderlog-setup-v2.sh
```

---

## 🔧 最優先修正項目（Supabase Dashboard）

### 🚨 必須設定: Redirect URLs

**この設定なしでは Magic Link 認証が動作しません！**

#### 手順:

1. **Supabase Dashboard にアクセス**
   - URL: https://supabase.com/dashboard
   - プロジェクト: `mpkbrztzanqswwbdooay`

2. **Authentication → URL Configuration**

3. **Redirect URLs セクションで追加:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```

4. **Save をクリック**

#### 確認方法:

```sql
-- SQL Editorで実行（設定確認はできないが、動作テストで確認）
-- ログインテスト → Magic Linkクリック → /admin または /dashboard に遷移すればOK
```

---

## 🗂️ プロジェクト構造（最新版）

### 重要ファイル一覧

```
orderlog/
├── app/
│   ├── api/
│   │   ├── auth/magic-link/route.ts    ✅ 修正済み（Service Role使用）
│   │   ├── admin/                      ✅ Phase 2実装済み
│   │   ├── submissions/route.ts        ✅ 2画像対応
│   │   └── evaluate/route.ts           ✅ AI評価
│   ├── auth/callback/route.ts          ✅ 修正済み（ロール別リダイレクト）
│   ├── admin/page.tsx                  ✅ 管理者ページ
│   ├── dashboard/page.tsx              ✅ 画像圧縮実装
│   └── login/page.tsx                  ✅ 既存/新規判定
├── lib/
│   └── supabase/
│       └── server.ts                   ✅ Service Role Client追加
├── components/
│   └── admin/                          ✅ 管理者UIコンポーネント
├── supabase/migrations/                ✅ 6つのマイグレーション適用済み
├── middleware.ts                       ✅ 修正済み（/auth/callback除外）
└── .env.local                          ✅ SUPABASE_SERVICE_ROLE_KEY追加
```

---

## 🔑 必須環境変数

### .env.local の内容

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mpkbrztzanqswwbdooay.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ← Phase 2で追加

# Site URL（重要！）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=your-openai-key
```

### Service Role Key の取得方法

1. Supabase Dashboard → Settings → API
2. "Project API keys" セクション
3. `service_role` の `secret` をコピー
4. `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` に設定

---

## 📊 データベース構造（確定版）

### テーブル一覧

#### 1. user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'
  department TEXT,           -- Phase 2追加
  admin_notes TEXT,          -- Phase 2追加
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効（Service Role Clientでバイパス）
```

#### 2. submissions
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  image_url TEXT,                 -- 旧カラム（互換性維持）
  luggage_image_url TEXT,         -- Phase 2追加
  toolbox_image_url TEXT,         -- Phase 2追加
  luggage_score INTEGER,          -- Phase 2追加
  toolbox_score INTEGER,          -- Phase 2追加
  luggage_feedback TEXT,          -- Phase 2追加
  toolbox_feedback TEXT,          -- Phase 2追加
  score INTEGER,                  -- 総合スコア
  ai_feedback TEXT,               -- 総合フィードバック
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOT NULL制約解除済み（Phase 2修正）
```

#### 3. security_settings
```sql
CREATE TABLE security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  new_user_auth_code TEXT DEFAULT '1234',
  allowed_domains TEXT[] DEFAULT ARRAY['icloud.com', 'gmail.com', 'example.com']
);

-- 初期データ挿入済み
```

### Database Triggers

```sql
-- auth.users作成時に自動的にuser_profilesレコード作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🧪 動作確認手順

### テスト1: 既存ユーザーログイン

1. **開発サーバー起動**
   ```bash
   npm run dev
   ```

2. **ログインページにアクセス**
   ```
   http://localhost:3000/login
   ```

3. **ログイン情報入力**
   ```
   メールアドレス: reiji.sy601@icloud.com
   認証コード: 空欄
   ```

4. **ターミナルログ確認**
   ```
   ✅ 既存ユーザー検出: reiji.sy601@icloud.com
   ✅ ログイン用Magic Link送信成功
   ⚠️ 開発環境: Magic Linkをメールから60秒以内に開いてください
   ```

5. **60秒以内にMagic Linkクリック**

6. **期待される結果**
   ```
   ターミナルログ:
   === Auth Callback 開始 ===
   ✅ セッション確立成功
   プロフィール: { role: 'admin' }
   ✅ 管理者としてリダイレクト: /admin
   
   ブラウザ:
   /admin ページが表示される
   ```

### テスト2: 新規ユーザー登録

```
メールアドレス: newuser@icloud.com
認証コード: 1234

期待される結果:
→ Magic Link送信成功
→ /dashboard にリダイレクト
```

---

## 🐛 トラブルシューティング

### 問題A: まだ /login にリダイレクトされる

**原因:** Supabase Redirect URLs 未設定

**解決策:**
1. Supabase Dashboard → Authentication → URL Configuration
2. `http://localhost:3000/auth/callback` を追加
3. 開発サーバー再起動
4. 再テスト

### 問題B: コールバックログが出ない

**確認コマンド:**
```bash
ls -la app/auth/callback/route.ts
grep "emailRedirectTo" app/api/auth/magic-link/route.ts
```

**期待される出力:**
```
app/auth/callback/route.ts が存在
emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
```

### 問題C: Service Role Key エラー

**確認:**
```bash
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
```

**修正:**
- Supabase Dashboard → Settings → API → service_role secret をコピー
- `.env.local` に追加
- 開発サーバー再起動

---

## 📦 完全ファイルリスト（新規セッション用）

### バックアップ推奨ファイル

1. **app/api/auth/magic-link/route.ts**
   - Service Role Client使用
   - 既存/新規ユーザー判定
   - 詳細ログ

2. **app/auth/callback/route.ts**
   - セッション確立
   - ロール別リダイレクト
   - フェイルセーフ（user_profiles自動作成）

3. **lib/supabase/server.ts**
   - createClient()
   - createServiceRoleClient() ← 追加

4. **middleware.ts**
   - /admin, /dashboard 保護
   - /auth/callback 除外

5. **.env.local**
   - SUPABASE_SERVICE_ROLE_KEY ← 追加

### マイグレーションファイル

```
supabase/migrations/
├── 20251021103000_add_admin_features.sql
├── 20251021160000_user_profiles_trigger.sql
├── 20251021170000_add_security_settings_columns.sql
├── 20251021173000_update_submissions_schema.sql
└── 20251021174500_relax_submissions_constraints.sql
```

---

## 🎯 CLI Codexへの指示テンプレート

新規セッションで以下をコピー&ペーストしてください:

```
OrderLogプロジェクトのセットアップをお願いします。

【プロジェクト概要】
- 車両荷物管理システム（AI画像評価）
- Phase 2実装完了（管理者ページ、ユーザー管理、統計）
- Supabase + Next.js 15 + React 19

【重要な実装済み内容】
1. Service Role Client（RLSバイパス）実装済み
2. Magic Link認証フロー修正済み（既存/新規ユーザー判定）
3. コールバック処理強化済み（ロール別リダイレクト）
4. 画像圧縮・AI評価・データベース保存フロー完成

【現在の問題】
- Magic Linkクリック後に /login にリダイレクトされる
- 原因: Supabase Dashboard の Redirect URLs 設定不足

【必要な作業】
1. プロジェクトファイルの確認（app/auth/callback/route.ts など）
2. Supabase Redirect URLs 設定の確認指示
3. 動作テスト実施

【参考ファイル】
- orderlog-setup-v2.sh
- CODEX_SESSION_GUIDE.md（このファイル）
```

---

## 📞 サポート情報

### 主要アカウント

- 管理者: `reiji.sy601@icloud.com` (role: admin)
- 一般ユーザー: `ukusiikeit1@gmail.com` (role: user)
- 認証コード: `1234`

### Supabase Project

- Project Ref: `mpkbrztzanqswwbdooay`
- URL: `https://mpkbrztzanqswwbdooay.supabase.co`

---

## ✅ チェックリスト

新規セッション立ち上げ時:

- [ ] セットアップスクリプト実行
- [ ] 環境変数確認（特にSERVICE_ROLE_KEY）
- [ ] Supabase Redirect URLs 設定
- [ ] 重要ファイル存在確認
- [ ] 開発サーバー起動
- [ ] ログインテスト（60秒以内にMagic Linkクリック）
- [ ] /admin ページアクセス確認

---

**作成日:** 2025-10-22  
**バージョン:** 2.0  
**対象:** 新規CLI Codexセッション  
**問題:** Magic Link認証のリダイレクト問題
