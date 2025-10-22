#!/bin/bash

################################################################################
# codex-init.sh - Codex起動時の自動初期化スクリプト（拡張版）
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Codex 自動初期化スクリプト（拡張版）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 環境変数の読み込み
if [ -f ".env.codex" ]; then
  print_success "環境変数を読み込んでいます..."
  set -a
  source .env.codex
  set +a
  
  if [ -z "$CODEX_API_TOKEN" ]; then
    print_warning "CODEX_API_TOKEN が設定されていません"
  else
    print_success "CODEX_API_TOKEN 確認完了"
  fi
else
  print_warning ".env.codex が見つかりません"
fi

# プロジェクト情報の取得
if [ -f ".codex-context.md" ]; then
  print_success "プロジェクト情報を読み込んでいます..."
  PROJECT_CONTEXT=$(cat .codex-context.md)
else
  print_warning ".codex-context.md が見つかりません"
  PROJECT_CONTEXT="プロジェクト: 未設定"
fi

# 前回の作業記録確認
if [ -f ".codex-progress.md" ]; then
  print_success "前回の作業記録を確認しています..."
  PROGRESS=$(tail -n 30 .codex-progress.md)
else
  print_warning ".codex-progress.md が見つかりません"
  PROGRESS="作業記録なし（初回起動）"
fi

# 設計決定記録の読み込み
if [ -f ".codex-decisions.md" ]; then
  print_success "設計決定記録を読み込んでいます..."
  DECISIONS=$(cat .codex-decisions.md)
else
  print_warning ".codex-decisions.md が見つかりません"
  DECISIONS="設計決定記録なし"
fi

# 最新セッションログの読み込み
if [ -d ".codex-sessions" ]; then
  LATEST_SESSION=$(ls -t .codex-sessions/*.md 2>/dev/null | head -1)
  if [ -n "$LATEST_SESSION" ]; then
    SESSION_NAME=$(basename "$LATEST_SESSION")
    print_success "前回のセッションログを読み込んでいます... ($SESSION_NAME)"
    SESSION_LOG=$(cat "$LATEST_SESSION")
  else
    print_warning "セッションログが見つかりません"
    SESSION_LOG="セッションログなし（初回セッション）"
  fi
else
  print_warning ".codex-sessions/ ディレクトリが見つかりません"
  SESSION_LOG="セッションログなし"
fi

# クイックメモの読み込み
if [ -f ".codex-memo.md" ]; then
  print_success "クイックメモを読み込んでいます..."
  MEMO=$(cat .codex-memo.md)
  
  # 最終更新時刻を自動更新
  CURRENT_TIME=$(date +"%Y-%m-%d %H:%M:%S")
  sed -i.bak "s/最終更新: .*/最終更新: $CURRENT_TIME/" .codex-memo.md
  rm -f .codex-memo.md.bak
else
  print_warning ".codex-memo.md が見つかりません"
  MEMO="メモなし"
fi

# セキュリティチェック
print_info "セキュリティチェックを実行中..."
if grep -r "SUPABASE_SERVICE_ROLE_KEY" . --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -q "eyJ" 2>/dev/null; then
  print_error "本番のSupabaseキーが検出されました！"
else
  print_success "セキュリティチェック完了"
fi

# 情報表示
print_info "Codexに情報を送信しています...\n"

AUTO_PROMPT="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【プロジェクト情報】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$PROJECT_CONTEXT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【前回の作業状況】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$PROGRESS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【設計決定記録】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$DECISIONS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【前回セッションの詳細】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$SESSION_LOG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【クイックメモ】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$MEMO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【今回のセッションで重要なこと】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- このプロジェクトは継続作業です
- 上記の設計決定の理由を尊重してください
- 前回のセッションで発生した問題を参考にしてください
- セキュリティガードレールを常に意識してください
- ローカル環境を優先してください

【自動化設定】
- SAFE_MODE: 有効
- LOCAL_FIRST: 有効
- PRODUCTION_GUARD: 有効
"

echo "$AUTO_PROMPT"

print_success "\n準備完了！Codexでの作業を開始できます 🚀\n"

print_info "次のステップ:"
echo "  1. Codexに作業内容を伝える"
echo "  2. 作業中は .codex-memo.md に気づきをメモ"
echo "  3. 重要な決定は .codex-decisions.md に記録"
echo "  4. 作業終了後、セッションログを更新"
echo ""

