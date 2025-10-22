INSERT INTO submissions (user_id, image_url, score, month, analysis_result)
SELECT up.id, 'https://example.com/image-' || up.id, 85, to_char(NOW(), 'YYYY-MM'), 'Sample analysis'
FROM user_profiles up
WHERE up.role = 'user'
LIMIT 5;

INSERT INTO admin_logs (admin_id, action, target_user_id, details)
SELECT
  admin_users.id,
  'seed_action',
  up.id,
  jsonb_build_object('note', 'Seeded log for ' || up.email)
FROM user_profiles up
JOIN user_profiles admin_users
  ON admin_users.role = 'admin'
LIMIT 5;

INSERT INTO user_profiles (id, email, role)
SELECT gen_random_uuid(), 'seed-' || generate_series || '@example.com', 'user'
FROM generate_series(1, 5);
