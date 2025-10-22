#!/bin/bash

################################################################################
# orderlog-setup.sh - OrderLog プロジェクト完全自動セットアップ (v1.0)
#
# 目的: 新しいCLI Codexセッションでの即座のプロジェクト復元
#
# 実行タイミング: 新しいCodexセッション開始時に1回
# 所要時間: 2-5分
#
# 機能:
# 1. 環境チェック（Node.js, npm, Supabase CLI）
# 2. 依存関係の自動インストール
# 3. 環境変数の検証
# 4. Supabase接続テスト
# 5. プロジェクト情報の表示
# 6. 開発サーバー起動オプション
#
# 使い方:
#   chmod +x orderlog-setup.sh
#   ./orderlog-setup.sh
#
################################################################################

set -e  # エラー時に即座に停止

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# プロジェクト情報
PROJECT_NAME="OrderLog"
PROJECT_VERSION="1.0.0"
PHASE="Phase 1 完了 (Phase 2 準備中)"

################################################################################
# ヘルパー関数
################################################################################

print_header() {
  echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}  $1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_command() {
  echo -e "${CYAN}📝 $1${NC}"
}

################################################################################
# プロジェクト情報の表示
################################################################################

show_project_info() {
  clear
  echo -e "${MAGENTA}"
  cat << 'LOGO_EOF'
   ___          _           _                 
  / _ \ _ __ __| | ___ _ __| |    ___   __ _  
 | | | | '__/ _` |/ _ \ '__| |   / _ \ / _` | 
 | |_| | | | (_| |  __/ |  | |__| (_) | (_| | 
  \___/|_|  \__,_|\___|_|  |_____\___/ \__, | 
                                        |___/  
LOGO_EOF
  echo -e "${NC}"
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  整理整頓記録システム - AI評価プラットフォーム${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  echo -e "${BLUE}📋 プロジェクト情報:${NC}"
  echo -e "  • プロジェクト名: ${GREEN}$PROJECT_NAME${NC}"
  echo -e "  • バージョン: ${GREEN}$PROJECT_VERSION${NC}"
  echo -e "  • 開発フェーズ: ${GREEN}$PHASE${NC}"
  echo -e ""
  
  echo -e "${BLUE}🛠️  技術スタック:${NC}"
  echo -e "  • Next.js ${GREEN}15.5.6${NC} (App Router + Turbopack)"
  echo -e "  • React ${GREEN}19.1.0${NC}"
  echo -e "  • Supabase ${GREEN}(Auth + PostgreSQL + Storage)${NC}"
  echo -e "  • OpenAI ${GREEN}GPT-5 mini${NC} (gpt-5-mini-2025-08-07)"
  echo -e "  • Tailwind CSS ${GREEN}v4${NC}"
  echo -e "  • shadcn/ui ${GREEN}(19 components)${NC}"
  echo -e ""
  
  echo -e "${BLUE}✨ 主要機能:${NC}"
  echo -e "  ✅ マジックリンク認証（4桁コード + 3回失敗5分ロック）"
  echo -e "  ✅ 2枚画像アップロード（車の荷台 + 道具収納）"
  echo -e "  ✅ GPT-5 mini AI評価（20-98点スケール）"
  echo -e "  ✅ 月1回提出制限（同月上書き更新）"
  echo -e "  ✅ 履歴タブ（統計サマリー + 履歴リスト）"
  echo -e "  ✅ ウルトラモダンUI（ガラスモーフィズム + グラデーション）"
  echo -e ""
  
  echo -e "${BLUE}📊 データベース:${NC}"
  echo -e "  • user_profiles: ユーザー情報（role: user/admin）"
  echo -e "  • submissions: 提出記録（UNIQUE(user_id, year_month)）"
  echo -e "  • security_settings: セキュリティ設定（シングルトン）"
  echo -e "  • Storage Bucket: submissions（Private, 10MB制限）"
  echo -e ""
  
  echo -e "${BLUE}🔗 Supabase:${NC}"
  echo -e "  • Project Ref: ${GREEN}mpkbrztzanqswwbdooay${NC}"
  echo -e "  • Project URL: ${GREEN}https://mpkbrztzanqswwbdooay.supabase.co${NC}"
  echo -e ""
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

################################################################################
# 1. 事前チェック
################################################################################

run_prechecks() {
  print_header "1. 環境チェック"
  
  # Node.jsの確認
  if ! command -v node &> /dev/null; then
    print_error "Node.jsがインストールされていません"
    echo "  → https://nodejs.org/ からインストールしてください"
    exit 1
  fi
  NODE_VERSION=$(node -v)
  print_success "Node.js $NODE_VERSION 検出"
  
  # npmの確認
  if ! command -v npm &> /dev/null; then
    print_error "npmがインストールされていません"
    exit 1
  fi
  NPM_VERSION=$(npm -v)
  print_success "npm $NPM_VERSION 検出"
  
  # package.jsonの確認
  if [ ! -f "package.json" ]; then
    print_error "package.jsonが見つかりません"
    echo "  → プロジェクトのルートディレクトリで実行してください"
    exit 1
  fi
  print_success "package.json 検出"
  
  # Supabase CLIの確認（オプショナル）
  if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version 2>&1 | head -n 1)
    print_success "Supabase CLI 検出: $SUPABASE_VERSION"
  else
    print_warning "Supabase CLI が見つかりません（オプショナル）"
    echo "  → インストール: npm install -g supabase"
  fi
  
  echo ""
}

################################################################################
# 2. 依存関係のインストール
################################################################################

install_dependencies() {
  print_header "2. 依存関係のインストール"
  
  if [ -d "node_modules" ]; then
    print_info "node_modules が存在します"
    read -p "再インストールしますか？ (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      print_info "依存関係を再インストールしています..."
      print_command "npm install"
      npm install
      print_success "依存関係のインストール完了"
    else
      print_success "スキップしました（既存のnode_modulesを使用）"
    fi
  else
    print_info "依存関係をインストールしています..."
    print_command "npm install"
    npm install
    print_success "依存関係のインストール完了"
  fi
  
  echo ""
}

################################################################################
# 3. 環境変数の検証
################################################################################

verify_environment() {
  print_header "3. 環境変数の検証"
  
  if [ ! -f ".env.local" ]; then
    print_error ".env.local が見つかりません"
    echo ""
    echo "  必要な環境変数:"
    echo "    • NEXT_PUBLIC_SUPABASE_URL"
    echo "    • NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "    • SUPABASE_SERVICE_ROLE_KEY"
    echo "    • OPENAI_API_KEY"
    echo ""
    echo "  → .env.local を作成してください"
    exit 1
  fi
  
  print_success ".env.local 検出"
  
  # 環境変数の読み込み
  set -a
  source .env.local
  set +a
  
  # 必須変数のチェック
  MISSING_VARS=()
  
  if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
  else
    print_success "NEXT_PUBLIC_SUPABASE_URL 設定済み"
  fi
  
  if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  else
    print_success "NEXT_PUBLIC_SUPABASE_ANON_KEY 設定済み"
  fi
  
  if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
  else
    print_success "SUPABASE_SERVICE_ROLE_KEY 設定済み"
  fi
  
  if [ -z "$OPENAI_API_KEY" ]; then
    MISSING_VARS+=("OPENAI_API_KEY")
  else
    print_success "OPENAI_API_KEY 設定済み"
  fi
  
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "以下の環境変数が設定されていません:"
    for var in "${MISSING_VARS[@]}"; do
      echo "    • $var"
    done
    echo ""
    exit 1
  fi
  
  print_success "すべての必須環境変数が設定されています"
  echo ""
}

################################################################################
# 4. Supabase接続テスト
################################################################################

test_supabase_connection() {
  print_header "4. Supabase接続テスト"
  
  print_info "Supabase接続を確認しています..."
  print_info "Project URL: $NEXT_PUBLIC_SUPABASE_URL"
  
  # 簡易的な接続テスト（anon keyで認証なしリクエスト）
  if curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" | grep -q "200\|401"; then
    print_success "Supabase接続成功"
  else
    print_warning "Supabase接続を確認できませんでした（ネットワークエラーの可能性）"
    echo "  → 開発サーバー起動後に再確認してください"
  fi
  
  echo ""
}

################################################################################
# 5. プロジェクト構造の確認
################################################################################

verify_project_structure() {
  print_header "5. プロジェクト構造の確認"
  
  # 重要なディレクトリ
  REQUIRED_DIRS=(
    "app"
    "components"
    "lib"
    "supabase/migrations"
  )
  
  for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      print_success "$dir/ 存在確認"
    else
      print_error "$dir/ が見つかりません"
    fi
  done
  
  # 重要なファイル
  REQUIRED_FILES=(
    "app/dashboard/page.tsx"
    "app/login/page.tsx"
    "components/image-upload-card.tsx"
    "components/history-tab.tsx"
    "middleware.ts"
    "next.config.ts"
  )
  
  for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
      print_success "$file 存在確認"
    else
      print_warning "$file が見つかりません"
    fi
  done
  
  # shadcn/uiコンポーネント数のカウント
  if [ -d "components/ui" ]; then
    COMPONENT_COUNT=$(find components/ui -name "*.tsx" | wc -l | tr -d ' ')
    print_success "shadcn/ui コンポーネント: $COMPONENT_COUNT 個"
    
    if [ "$COMPONENT_COUNT" -lt 19 ]; then
      print_warning "期待される19個より少ないコンポーネント数です"
    fi
  else
    print_warning "components/ui/ が見つかりません"
  fi
  
  # マイグレーションファイル数
  if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
    print_success "データベースマイグレーション: $MIGRATION_COUNT 個"
  fi
  
  echo ""
}

################################################################################
# 6. 重要な情報の表示
################################################################################

show_important_info() {
  print_header "6. 重要な情報"
  
  echo -e "${YELLOW}🔑 GPT-5 mini 重要な設定:${NC}"
  echo "  • モデル: gpt-5-mini-2025-08-07"
  echo "  • max_completion_tokens: 500 (検証) / 800 (評価)"
  echo "  • temperature: デフォルト値1（カスタム値非サポート）"
  echo "  • 推論トークン: 約100トークン使用"
  echo ""
  
  echo -e "${YELLOW}🗄️  Supabase Storage:${NC}"
  echo "  • Bucket: submissions (Private)"
  echo "  • Max file size: 10MB"
  echo "  • 署名付きURL: 1時間有効（OpenAI API用）"
  echo ""
  
  echo -e "${YELLOW}🎨 デザインシステム:${NC}"
  echo "  • ガラスモーフィズム: backdrop-blur-md bg-white/70"
  echo "  • グラデーション: from-indigo-600 to-purple-600"
  echo "  • アイコン: Lucide Icons（絵文字完全削除）"
  echo ""
  
  echo -e "${YELLOW}📝 よく使うコマンド:${NC}"
  print_command "npm run dev              # 開発サーバー起動 (localhost:3000)"
  print_command "npm run build            # 本番ビルドテスト"
  print_command "npx supabase db push     # マイグレーション適用"
  print_command "vercel --prod            # 本番デプロイ"
  echo ""
  
  echo -e "${YELLOW}🔍 トラブルシューティング:${NC}"
  echo "  • 環境変数エラー → .env.local を確認"
  echo "  • 依存関係エラー → rm -rf node_modules && npm install"
  echo "  • ポート競合 → lsof -ti:3000 | xargs kill"
  echo "  • AI評価エラー → OpenAI API キーを確認"
  echo ""
}

################################################################################
# 7. Phase 2 計画の表示
################################################################################

show_phase2_plan() {
  print_header "7. Phase 2 実装計画"
  
  echo -e "${CYAN}🚀 Phase 2: 管理者機能（実装待ち）${NC}"
  echo ""
  
  echo "  📋 予定機能:"
  echo "    • 管理者ページ (/admin)"
  echo "    • ユーザー一覧・管理"
  echo "    • 全体統計ダッシュボード"
  echo "    • セキュリティ設定編集UI"
  echo "    • スコア推移グラフ（Chart.js/Recharts）"
  echo ""
  
  echo "  🔧 必要なAPI Routes:"
  echo "    • POST   /api/admin/users"
  echo "    • DELETE /api/admin/users/[id]"
  echo "    • GET    /api/admin/stats"
  echo "    • PUT    /api/admin/settings"
  echo ""
  
  echo "  📦 必要なコンポーネント:"
  echo "    • components/admin/user-table.tsx"
  echo "    • components/admin/stats-dashboard.tsx"
  echo "    • components/admin/security-settings-form.tsx"
  echo ""
}

################################################################################
# 8. 開発サーバー起動オプション
################################################################################

start_dev_server() {
  print_header "8. 開発サーバー起動"
  
  read -p "開発サーバーを起動しますか？ (y/N): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "開発サーバーを起動しています..."
    print_command "npm run dev"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🚀 サーバー起動中...${NC}"
    echo -e "${GREEN}  📱 http://localhost:3000${NC}"
    echo -e "${GREEN}  🛑 停止: Ctrl + C${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    npm run dev
  else
    print_info "スキップしました"
    echo ""
    print_info "後で起動する場合:"
    print_command "npm run dev"
    echo ""
  fi
}

################################################################################
# セットアップ完了サマリー
################################################################################

show_completion_summary() {
  print_header "セットアップ完了"
  
  echo -e "${GREEN}"
  cat << 'COMPLETE_EOF'
  ✨ OrderLog セットアップ完了 ✨
  
   ____          _       _       _             _ 
  / ___|___   __| | ___ | |_ __ (_)___ ___  __| |
 | |   / _ \ / _` |/ _ \| __/ _|| |_  // _ \/ _` |
 | |__| (_) | (_| |  __/| || (_|| |/ /|  __/ (_| |
  \____\___/ \__,_|\___(_)__\__,_|/___|___|\__,_|
  
COMPLETE_EOF
  echo -e "${NC}"
  
  print_success "すべてのセットアップが完了しました！"
  echo ""
  
  print_info "次のステップ:"
  echo "  1. 開発サーバーを起動: npm run dev"
  echo "  2. ブラウザで確認: http://localhost:3000"
  echo "  3. Phase 2（管理者機能）の実装開始"
  echo ""
  
  print_info "参考資料:"
  echo "  • プロジェクトサマリー: README.md (存在する場合)"
  echo "  • データベース: supabase/migrations/*.sql"
  echo "  • API Routes: app/api/*"
  echo ""
  
  print_success "🎉 準備完了！開発を始めましょう！"
  echo ""
}

################################################################################
# メイン実行フロー
################################################################################

main() {
  show_project_info
  
  sleep 2
  
  run_prechecks
  install_dependencies
  verify_environment
  test_supabase_connection
  verify_project_structure
  show_important_info
  show_phase2_plan
  
  show_completion_summary
  
  start_dev_server
}

# スクリプト実行
main
