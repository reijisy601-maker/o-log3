#!/bin/bash

################################################################################
# codex-context-setup.sh - コンテキスト管理ファイルの自動生成
#
# 目的: CLI Codexのセッション間でコンテキストを引き継ぐためのファイル構造を作成
#
# 使い方:
#   chmod +x codex-context-setup.sh
#   ./codex-context-setup.sh
################################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  コンテキスト管理ファイルのセットアップ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

################################################################################
# 1. .codex-decisions.md の作成
################################################################################

if [ ! -f ".codex-decisions.md" ]; then
  print_info ".codex-decisions.md を作成中..."
  cat > .codex-decisions.md << 'DECISIONS_EOF'
# 設計決定記録 (Architecture Decision Records)

このファイルには、プロジェクトで行った重要な設計決定を記録します。
新しいセッションでCodexがこれを読み込み、過去の判断を理解します。

## テンプレート

```
## [YYYY-MM-DD] 決定事項のタイトル

### 決定内容
何を決めたか

### 理由
なぜそう決めたか

### 影響
どのような影響があるか

### トラブルシューティング履歴
発生した問題と解決方法
```

---

## [2025-10-20] プロジェクト初期化完了

### 決定内容
- Next.js 15.5.6 + Turbopack
- shadcn/ui + V0コンポーネント
- Codex自動化環境

### 理由
- 高速な開発体験（Turbopack）
- アクセシブルなUIコンポーネント（shadcn/ui）
- 効率的なワークフロー（Codex自動化）

### 影響
- 開発サーバー起動時間: 728ms
- UIコンポーネント: 19個利用可能
- 毎回のセッション開始時間: 10秒に短縮

DECISIONS_EOF
  print_success ".codex-decisions.md を作成しました"
else
  print_warning ".codex-decisions.md は既に存在します"
fi

################################################################################
# 2. .codex-sessions/ ディレクトリの作成
################################################################################

if [ ! -d ".codex-sessions" ]; then
  print_info ".codex-sessions/ ディレクトリを作成中..."
  mkdir -p .codex-sessions
  
  # 初回セッションログのテンプレート作成
  SESSION_DATE=$(date +%Y%m%d)
  cat > .codex-sessions/${SESSION_DATE}-session1.md << SESSION_EOF
# セッション記録: $(date +%Y-%m-%d) Session 1

## 開始時刻
$(date +%Y-%m-%d\ %H:%M:%S)

## セッション目標
- （ここに今回のセッションで達成したいことを記入）

## 実行したコマンド
1. \`./codex-init.sh\`
2. （実行したコマンドを記録）

## 発生した問題と解決
### 問題1: （タイトル）
- 原因: （原因の説明）
- 解決: （解決方法）
  \`\`\`bash
  # 実行したコマンド
  \`\`\`

## 生成されたファイル
- （ファイル名とその説明）

## 次回への引き継ぎ
- （次のセッションで続ける内容）

## 重要なメモ
- （覚えておくべきこと）

SESSION_EOF
  
  print_success ".codex-sessions/ ディレクトリと初回セッションログを作成しました"
else
  print_warning ".codex-sessions/ は既に存在します"
fi

################################################################################
# 3. .codex-memo.md の作成
################################################################################

if [ ! -f ".codex-memo.md" ]; then
  print_info ".codex-memo.md を作成中..."
  cat > .codex-memo.md << 'MEMO_EOF'
# クイックメモ

最終更新: （自動更新されます）

## 現在の状態
- ✅ （完了したこと）
- ⏳ （進行中のこと）
- ❌ （ブロックされていること）

## 気になること
- （調査が必要なこと）
- （確認したいこと）

## TODO（優先順位順）
1. [ ] （最優先タスク）
2. [ ] （次のタスク）
3. [ ] （その次のタスク）

## よく使うコマンド
```bash
./codex-init.sh          # 毎回の起動
npm run dev              # 開発サーバー
code .codex-progress.md  # 進捗記録
```

## トラブルシューティング
- （問題） → （解決方法）

## 次回セッションへの引き継ぎ
- （重要な引き継ぎ事項）

MEMO_EOF
  print_success ".codex-memo.md を作成しました"
else
  print_warning ".codex-memo.md は既に存在します"
fi

################################################################################
# 4. .gitignore の更新
################################################################################

print_info ".gitignore を更新中..."
if [ -f ".gitignore" ]; then
  if ! grep -q ".codex-sessions" .gitignore; then
    cat >> .gitignore << 'GITIGNORE_EOF'

# Codex セッションログ（プライベート情報を含む可能性があるため）
.codex-sessions/
.codex-memo.md

# 共有するファイル（コミットする）
# .codex-context.md
# .codex-progress.md
# .codex-decisions.md
GITIGNORE_EOF
    print_success ".gitignore に Codexファイルの除外設定を追加しました"
  else
    print_warning ".gitignore は既に設定済みです"
  fi
else
  print_warning ".gitignore が見つかりません"
fi

################################################################################
# 5. 更新された codex-init.sh の生成
################################################################################

print_info "codex-init.sh を更新中..."

# 既存のcodex-init.shをバックアップ
if [ -f "codex-init.sh" ]; then
  cp codex-init.sh codex-init.sh.backup
  print_info "既存の codex-init.sh を codex-init.sh.backup にバックアップしました"
fi

cat > codex-init.sh << 'INIT_SCRIPT_EOF'
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

INIT_SCRIPT_EOF

chmod +x codex-init.sh
print_success "codex-init.sh を更新しました（拡張版）"

################################################################################
# セットアップ完了
################################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  セットアップ完了${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_success "コンテキスト管理ファイルの準備が完了しました！"
echo ""

print_info "作成されたファイル:"
echo "  ✅ .codex-decisions.md         - 設計決定記録"
echo "  ✅ .codex-sessions/            - セッションログ"
echo "  ✅ .codex-memo.md              - クイックメモ"
echo "  ✅ codex-init.sh（更新）        - 拡張版初期化スクリプト"
echo ""

print_info "使い方:"
echo "  1. セッション開始時"
echo "     ./codex-init.sh"
echo ""
echo "  2. 作業中"
echo "     重要な決定 → code .codex-decisions.md"
echo "     気づき → code .codex-memo.md"
echo ""
echo "  3. セッション終了時"
echo "     code .codex-sessions/$(date +%Y%m%d)-session1.md"
echo "     code .codex-progress.md"
echo ""

print_success "🚀 これでセッション間のコンテキスト引き継ぎが完璧です！"
echo ""