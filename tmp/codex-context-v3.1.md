# プロジェクト情報: o-log2

## 基本情報
- **プロジェクト名**: o-log2
- **技術スタック**: Next.js 14 (App Router), Supabase, Vercel
- **主要機能**: マジックリンク認証、ユーザー管理
- **開発環境**: ローカル（Supabase Local + Inbucket）

## UIコンポーネント
- **shadcn/ui**: Radixベースのアクセシブルなコンポーネントライブラリ
- **V0コンポーネント**: カスタムUIコンポーネント（自動インポート済み）
  - インポート日時: （このファイル作成時に自動記録されます）
  - V0トークン: 安全に管理されています
  - コンポーネント配置: `components/ui/`
  - 使用方法: `import { Button } from '@/components/ui/button'`

## 現在の課題
- 本番環境でテストするのが非効率（15分/サイクル）
- メール送信のテストに時間がかかる
- デプロイ→バグ→ロールバックのループ

## 解決策（実装済み）
- ✅ Supabase Local Development でローカル完結
- ✅ Inbucket (localhost:54324) でメール確認
- ✅ セキュリティガードレール（5層防御）
- ✅ V0コンポーネントの自動インポート
- ✅ shadcn/ui の初期化

## 優先事項
1. ローカルでマジックリンクをテスト
2. UIコンポーネントの整備（V0活用）
3. エラーハンドリングの実装
4. 本番デプロイ前の最終検証

## 開発ルール
- **SAFE_MODE**: 常に有効
- **LOCAL_FIRST**: ローカル環境を優先
- **NO_PROD_KEYS**: 本番キーは絶対に使わない
- **UI_CONSISTENCY**: V0コンポーネントを活用してデザイン統一
- **COMPONENT_REUSE**: 既存のV0コンポーネントを最大限活用

## V0コンポーネント管理
- **インポート方法**: `npx shadcn@latest add "v0-url-with-token"`
- **カスタマイズ**: `components/ui/` 内で直接編集可能
- **追加インポート**: 新しい画面が必要になったら随時追加
- **バージョン管理**: Gitで管理（.gitignoreに含めない）

## 参考リンク
- Supabase Docs: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com/
- V0 by Vercel: https://v0.dev/
- Radix UI: https://www.radix-ui.com/

---

**最終更新**: （自動記録されます）
