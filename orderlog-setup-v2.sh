#!/bin/bash

################################################################################
# orderlog-setup-v2.sh - OrderLog プロジェクト完全自動セットアップ (v2.0)
#
# 🔧 最新の修正内容（2025-10-22）:
# - Service Role Client実装（RLSバイパス）
# - Magic Link認証フロー修正（既存/新規ユーザー判定）
# - コールバック処理強化（ロール別リダイレクト）
# - Supabase URL設定チェック追加
#
# 目的: 新しいCLI Codexセッションでの即座のプロジェクト復元
#
# 実行タイミング: 新しいCodexセッション開始時に1回
# 所要時間: 2-5分
#
################################################################################

set -e

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# プロジェクト情報
PROJECT_NAME="OrderLog"
PROJECT_VERSION="2.0.0"
PHASE="Phase 2 実装中"

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

print_critical() {
  echo -e "${RED}🚨 【重要】 $1${NC}"
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
  echo ""
  
  echo -e "${BLUE}🛠️  技術スタック:${NC}"
  echo -e "  • Next.js ${GREEN}15.5.6${NC} (App Router + Turbopack)"
  echo -e "  • React ${GREEN}19.1.0${NC}"
  echo -e "  • Supabase (Auth + Database + Storage)"
  echo -e "  • OpenAI GPT-5 mini (AI評価エンジン)"
  echo -e "  • Tailwind CSS v4"
  echo -e "  • shadcn/ui"
  echo ""
  
  echo -e "${BLUE}🆕 最新の実装内容（Phase 2）:${NC}"
  echo -e "  ${GREEN}✅${NC} 管理者ページ (/admin)"
  echo -e "  ${GREEN}✅${NC} ユーザー管理（3ヶ月平均スコア、部署、メモ）"
  echo -e "  ${GREEN}✅${NC} 全体統計ダッシュボード"
  echo -e "  ${GREEN}✅${NC} セキュリティ設定UI"
  echo -e "  ${GREEN}✅${NC} Service Role Client（RLSバイパス）"
  echo -e "  ${GREEN}✅${NC} Magic Link認証フロー改善"
  echo -e "  ${GREEN}✅${NC} 画像圧縮最適化"
  echo -e "  ${GREEN}✅${NC} AI評価（2画像対応）"
  echo ""
}

################################################################################
# 環境チェック
################################################################################

check_environment() {
  print_header "環境チェック"
  
  # Node.js チェック
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js インストール済み: $NODE_VERSION"
  else
    print_error "Node.jsが見つかりません"
    exit 1
  fi
  
  # npm チェック
  if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm インストール済み: v$NPM_VERSION"
  else
    print_error "npmが見つかりません"
    exit 1
  fi
  
  echo ""
}

################################################################################
# プロジェクト構造確認
################################################################################

check_project_structure() {
  print_header "プロジェクト構造確認"
  
  # 重要なファイル/ディレクトリの確認
  CRITICAL_PATHS=(
    "app/api/auth/magic-link/route.ts"
    "app/auth/callback/route.ts"
    "app/admin/page.tsx"
    "app/dashboard/page.tsx"
    "lib/supabase/server.ts"
    "middleware.ts"
    ".env.local"
  )
  
  ALL_EXIST=true
  
  for path in "${CRITICAL_PATHS[@]}"; do
    if [ -f "$path" ] || [ -d "$path" ]; then
      print_success "$path 存在確認"
    else
      print_error "$path が見つかりません"
      ALL_EXIST=false
    fi
  done
  
  echo ""
  
  if [ "$ALL_EXIST" = false ]; then
    print_warning "一部のファイルが見つかりません。プロジェクト構造を確認してください。"
  fi
}

################################################################################
# 依存関係のインストール
################################################################################

install_dependencies() {
  print_header "依存関係のインストール"
  
  if [ -f "package.json" ]; then
    print_info "npm installを実行中..."
    npm install
    print_success "依存関係のインストール完了"
  else
    print_error "package.jsonが見つかりません"
    exit 1
  fi
  
  echo ""
}

################################################################################
# 環境変数の検証
################################################################################

verify_env_vars() {
  print_header "環境変数の検証"
  
  if [ ! -f ".env.local" ]; then
    print_error ".env.localが見つかりません"
    echo ""
    print_info ".env.local.example を参考に .env.local を作成してください"
    exit 1
  fi
  
  # 必須環境変数のリスト
  REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_SITE_URL"
    "OPENAI_API_KEY"
  )
  
  ALL_SET=true
  
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.local; then
      VALUE=$(grep "^$var=" .env.local | cut -d '=' -f2-)
      if [ -n "$VALUE" ] && [ "$VALUE" != "your-value-here" ]; then
        print_success "$var 設定済み"
      else
        print_error "$var が空または未設定"
        ALL_SET=false
      fi
    else
      print_error "$var が.env.localに存在しません"
      ALL_SET=false
    fi
  done
  
  echo ""
  
  if [ "$ALL_SET" = false ]; then
    print_error "環境変数の設定が不完全です"
    exit 1
  fi
  
  print_success "全ての環境変数が正しく設定されています"
  echo ""
}

################################################################################
# Supabase接続テスト
################################################################################

test_supabase_connection() {
  print_header "Supabase接続テスト"
  
  SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2-)
  
  if [ -n "$SUPABASE_URL" ]; then
    print_info "接続先: $SUPABASE_URL"
    
    if curl -s --head "$SUPABASE_URL" | grep "200 OK" > /dev/null; then
      print_success "Supabaseへの接続成功"
    else
      print_warning "Supabaseへの接続確認ができませんでした（ネットワークエラーの可能性）"
    fi
  else
    print_error "NEXT_PUBLIC_SUPABASE_URLが設定されていません"
  fi
  
  echo ""
}

################################################################################
# 重要な設定確認
################################################################################

show_critical_checks() {
  print_header "🚨 重要な設定確認（Phase 2 新規実装）"
  
  echo -e "${YELLOW}以下の設定を Supabase Dashboard で確認してください:${NC}\n"
  
  echo -e "${CYAN}1. Authentication → URL Configuration → Redirect URLs${NC}"
  echo -e "   必要な設定:"
  echo -e "   ${GREEN}✓${NC} http://localhost:3000/auth/callback"
  echo -e "   ${GREEN}✓${NC} http://localhost:3000/**"
  echo ""
  
  echo -e "${CYAN}2. Storage → submissions バケット → RLS Policies${NC}"
  echo -e "   必要なポリシー:"
  echo -e "   ${GREEN}✓${NC} INSERT: authenticated users"
  echo -e "   ${GREEN}✓${NC} SELECT: authenticated users"
  echo ""
  
  echo -e "${CYAN}3. Database → user_profiles テーブル → RLS${NC}"
  echo -e "   RLS状態: ${GREEN}有効${NC}"
  echo -e "   Service Role Clientで自動バイパス"
  echo ""
  
  echo -e "${CYAN}4. Database → security_settings テーブル${NC}"
  echo -e "   ${GREEN}✓${NC} new_user_auth_code: '1234'"
  echo -e "   ${GREEN}✓${NC} allowed_domains: ['icloud.com', 'gmail.com', 'example.com']"
  echo ""
  
  print_critical "Magic Link認証の問題を解決するために："
  echo -e "   ${RED}→ Supabase Dashboard で上記1番の設定を必ず確認！${NC}"
  echo -e "   ${RED}→ /auth/callback が Redirect URLs に含まれているか確認！${NC}"
  echo ""
}

################################################################################
# ファイル構造の表示
################################################################################

show_file_structure() {
  print_header "プロジェクト構造"
  
  echo -e "${BLUE}📁 主要ディレクトリ:${NC}"
  echo ""
  echo "app/"
  echo "├── api/"
  echo "│   ├── auth/magic-link/     # Magic Link認証API（修正済み）"
  echo "│   ├── admin/               # 管理者API"
  echo "│   ├── submissions/         # 提出データAPI"
  echo "│   └── evaluate/            # AI評価API"
  echo "├── auth/callback/           # 認証コールバック（修正済み）"
  echo "├── admin/                   # 管理者ページ"
  echo "├── dashboard/               # ダッシュボード"
  echo "└── login/                   # ログインページ"
  echo ""
  echo "lib/"
  echo "└── supabase/"
  echo "    └── server.ts            # Supabaseクライアント（Service Role追加）"
  echo ""
  echo "components/"
  echo "└── admin/                   # 管理者UIコンポーネント"
  echo ""
  echo "supabase/migrations/         # DBマイグレーション"
  echo ""
  echo "middleware.ts                # ルート保護（修正済み）"
  echo ""
}

################################################################################
# 既知の問題と解決策
################################################################################

show_known_issues() {
  print_header "🐛 既知の問題と解決策"
  
  echo -e "${RED}【問題1】Magic Linkクリック後に /login にリダイレクトされる${NC}"
  echo -e "${YELLOW}原因:${NC} Supabase側のRedirect URLs設定が不足"
  echo -e "${GREEN}解決策:${NC}"
  echo -e "  1. Supabase Dashboard → Authentication → URL Configuration"
  echo -e "  2. Redirect URLs に以下を追加:"
  echo -e "     ${CYAN}http://localhost:3000/auth/callback${NC}"
  echo -e "  3. Save をクリック"
  echo ""
  
  echo -e "${RED}【問題2】既存ユーザーなのに認証コードを求められる${NC}"
  echo -e "${YELLOW}原因:${NC} user_profilesテーブルのRLSでレコードが見えない"
  echo -e "${GREEN}解決策:${NC} Service Role Client実装済み（自動解決）"
  echo ""
  
  echo -e "${RED}【問題3】Magic Linkの有効期限切れ（60秒）${NC}"
  echo -e "${YELLOW}原因:${NC} デフォルトの有効期限が短い"
  echo -e "${GREEN}解決策:${NC}"
  echo -e "  1. Magic Link送信後、${RED}60秒以内${NC}にメールを開く"
  echo -e "  2. または、Supabase Dashboard → Authentication → Settings"
  echo -e "     で有効期限を300秒（5分）に延長"
  echo ""
}

################################################################################
# 次のステップ
################################################################################

show_next_steps() {
  print_header "🚀 次のステップ"
  
  echo -e "${GREEN}1. Supabase Dashboard で Redirect URLs を設定${NC}"
  echo -e "   ${CYAN}→ http://localhost:3000/auth/callback を追加${NC}"
  echo ""
  
  echo -e "${GREEN}2. 開発サーバーを起動${NC}"
  echo -e "   ${CYAN}npm run dev${NC}"
  echo ""
  
  echo -e "${GREEN}3. ログインテスト${NC}"
  echo -e "   ${CYAN}http://localhost:3000/login${NC}"
  echo -e "   メール: ${CYAN}reiji.sy601@icloud.com${NC}"
  echo -e "   認証コード: ${CYAN}空欄${NC}"
  echo ""
  
  echo -e "${GREEN}4. Magic Linkを60秒以内にクリック${NC}"
  echo -e "   ${CYAN}→ /admin ページにリダイレクトされることを確認${NC}"
  echo ""
  
  echo -e "${YELLOW}⚠️  もし /login にリダイレクトされる場合:${NC}"
  echo -e "   ${RED}→ 手順1のSupabase設定を確認してください${NC}"
  echo ""
}

################################################################################
# メイン実行
################################################################################

main() {
  show_project_info
  check_environment
  check_project_structure
  
  read -p "依存関係をインストールしますか? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    install_dependencies
  fi
  
  verify_env_vars
  test_supabase_connection
  
  show_critical_checks
  show_file_structure
  show_known_issues
  show_next_steps
  
  print_header "セットアップ完了"
  print_success "OrderLog プロジェクトの準備が整いました！"
  echo ""
  
  read -p "開発サーバーを起動しますか? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "開発サーバーを起動中..."
    npm run dev
  else
    print_info "後で 'npm run dev' で開発サーバーを起動してください"
  fi
}

# スクリプト実行
main
