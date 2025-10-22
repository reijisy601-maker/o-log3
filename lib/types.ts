/**
 * 共通型定義
 */

// 管理者操作ログ
export interface AdminLog {
  id: string
  timestamp: string
  admin_email: string
  action: string
  target_user_email?: string
  details?: string
  ip_address?: string
  user_agent?: string
}

// ユーザープロファイル
export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  role: 'user' | 'admin'
  department: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

// 提出データ
export interface Submission {
  id: string
  user_id: string
  luggage_image_url: string | null
  luggage_image_url_2: string | null
  luggage_image_url_3: string | null
  luggage_image_url_4: string | null
  toolbox_image_url: string | null
  toolbox_image_url_2: string | null
  toolbox_image_url_3: string | null
  toolbox_image_url_4: string | null
  luggage_score: number | null
  toolbox_score: number | null
  luggage_feedback: string | null
  toolbox_feedback: string | null
  submitted_at: string
  evaluated_at: string | null
}
