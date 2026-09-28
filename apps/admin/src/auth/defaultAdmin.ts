// 계정이 하나도 없는 서버가 켜질 때 기본 계정 admin 을 스스로 만든다 (SPEC 공통/6-인프라 §9.2 · 도메인/인증 §3.5)

import type { Pool, PoolClient } from 'pg';

import { 해시 } from './password.js';

export async function 기본계정만들기(client: PoolClient | Pool): Promise<boolean> {
  // 확인과 넣기를 한 문장으로 — 둘로 나누면 그 사이에 가입한 사람이 있어도 admin 이 생긴다.
  // 승인 대기 행도 「계정이 있다」로 친다. 표 이름을 한정하지 않는 것은 검사가 임시 표로 가리기 때문이다
  const r = await client.query(
    `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password, perm_dashboard)
     SELECT 'admin', '운영자', $1, 'admin', true, true, 'read'
      WHERE NOT EXISTS (SELECT 1 FROM app_user)
     ON CONFLICT (username) DO NOTHING`,
    [await 해시('admin')],
  );
  return r.rowCount === 1;
}
