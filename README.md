# OrderLog - 車両荷物管理システム

整理整頓記録システム - AI評価プラットフォーム

## 🎯 概要

車両の荷物・工具箱の整理状態をAIが評価し、スコア化するシステム。
管理者は全ユーザーの統計を確認でき、個別にフィードバック・管理が可能。

## ✨ 主な機能

### 一般ユーザー
- Magic Link認証ログイン
- 荷物・工具箱の画像アップロード（自動圧縮）
- AI評価によるスコア・フィードバック取得
- 提出履歴の確認

### 管理者
- ユーザー管理（部署、メモ、スコア確認）
- 全体統計ダッシュボード
- セキュリティ設定（認証コード、ドメイン制限）

## 🛠️ 技術スタック

- **Frontend**: Next.js 15.5.6, React 19.1.0, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (Magic Link)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-5 mini
- **Image Processing**: browser-image-compression

## 📦 セットアップ

### 前提条件
- Node.js 18+
- npm または yarn
- Supabaseアカウント
- OpenAI APIキー

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/reijisy601-maker/o-log3.git
cd o-log3
```

2. 依存関係のインストール
```bash
npm install
```

3. 環境変数の設定
```bash
cp .env.example .env.local
# .env.localを編集して実際の値を設定
```

4. Supabase設定
   - Authentication → URL Configuration → Redirect URLs
     - `http://localhost:3000/auth/callback` を追加

5. 開発サーバー起動
```bash
npm run dev
```

6. ブラウザで開く
```
http://localhost:3000
```

## 🗄️ データベース

### テーブル構造
- `user_profiles` - ユーザー情報（部署、ロール、管理者メモ）
- `submissions` - 提出記録（2画像対応）
- `security_settings` - セキュリティ設定

## 🔑 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=        # SupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase Anon Key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase Service Role Key
NEXT_PUBLIC_SITE_URL=            # サイトURL（本番環境で変更）
OPENAI_API_KEY=                  # OpenAI APIキー
```

## 📝 使い方

### 初回ログイン
1. `/login` ページでメールアドレスと認証コード（デフォルト: `1234`）を入力
2. メールで届いたMagic Linkをクリック
3. 自動的にダッシュボードにリダイレクト

### 画像評価
1. ダッシュボードで「荷物」と「工具箱」の画像をアップロード
2. 「評価を開始」をクリック（約20-25秒）
3. スコアとAIフィードバックを確認

### 管理者機能
1. 管理者ロールでログイン
2. `/admin` ページで各機能にアクセス

## 🚀 デプロイ

### Vercel（推奨）
1. GitHubリポジトリと接続
2. 環境変数を設定
3. `NEXT_PUBLIC_SITE_URL` を本番URLに変更
4. デプロイ

### 本番環境の注意点
- Supabase Redirect URLsに本番URLを追加
- 認証コードを複雑な値に変更
- デバッグログを無効化

## 📄 ライセンス

MIT

## 📧 連絡先

GitHub: https://github.com/reijisy601-maker
