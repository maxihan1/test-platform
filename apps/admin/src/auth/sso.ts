// maxihan 계정(SSO) 로그인 왕복 — 시작 · 돌아오기 · sub 로 계정 찾기 (SPEC 도메인/인증 §3.5 「maxihan 계정」 · §7 Auth)
// SSO 가 켜진 설치에서만 routes.ts 가 붙인다

import type { FastifyInstance } from 'fastify';

import { 작성계정인가 } from './agentToken.js';
import { 교환, 시작, type SSO설정 } from './oidc.js';
import { 아이디모양, 이름최대 } from './rules.js';

/** 첫 화면이 읽는 안내 칸. 값마다 로그인 화면의 문장이 하나다 (web/Login.tsx) */
export type SSO결과 = 'pending' | 'username' | 'failed';

interface 묶인계정 {
  username: string;
  is_approved: boolean;
  is_active: boolean;
}

/**
 * sub 로 계정을 찾는다. 없으면 같은 username 의 **아직 안 묶인** 행에 한 번 묶고, 그것도 없으면 승인 대기 계정을 만든다.
 * 묶은 뒤로는 sub 로만 찾는다 — username 은 Auth_platform 에서 바뀌거나 다시 쓰일 수 있다 (2026-10-20 사용자)
 */
export async function 계정찾기(sub: string, username: string, displayName: string): Promise<묶인계정 | 'username'> {
  const { pool } = await import('../db/index.js');
  const 찾은것 = await pool.query<묶인계정>('SELECT username, is_approved, is_active FROM app_user WHERE auth_sub = $1', [sub]);
  if (찾은것.rows[0] !== undefined) return 찾은것.rows[0];

  // 이 플랫폼 아이디 규칙을 못 지키는 이름과 작성 에이전트 이름은 받지 않는다 —
  // 에이전트 이름을 묶으면 Auth_platform 의 같은 이름 사용자가 에이전트 계정을 가져간다 (가입과 같은 규칙, signup.ts)
  if (!아이디모양.test(username) || 작성계정인가(username)) return 'username';

  // 기본 계정 admin · 설정에서 미리 만든 계정이 여기서 이어진다. 비밀번호는 지우지 않는다 — SSO 를 끄면 다시 쓴다
  const 묶음 = await pool.query<묶인계정>(
    'UPDATE app_user SET auth_sub = $1 WHERE username = $2 AND auth_sub IS NULL RETURNING username, is_approved, is_active',
    [sub, username],
  );
  if (묶음.rows[0] !== undefined) return 묶음.rows[0];

  // 가입과 같은 처음 상태다 — 권한 칸 없이 승인 대기. 운영자가 설정에서 수락할 때 권한을 정한다 (§3.5 「계정이 생기는 길」)
  const 새것 = await pool.query<묶인계정>(
    `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub)
          VALUES ($1, $2, NULL, 'member', 'none', false, false, $3)
     ON CONFLICT (username) DO NOTHING
     RETURNING username, is_approved, is_active`,
    [username, displayName.slice(0, 이름최대), sub],
  );
  // 다른 sub 가 이미 그 username 을 가졌다 (Auth_platform 에서 이름을 다시 쓴 경우 등)
  return 새것.rows[0] ?? 'username';
}

export default async function ssoRoutes(app: FastifyInstance, opts: { sso: SSO설정 }): Promise<void> {
  const { sso } = opts;
  const 첫화면 = (결과: SSO결과) => `/?sso=${결과}`;

  app.get('/auth/sso/start', async (req, reply) => {
    const { url, 왕복 } = await 시작(sso);
    // 왕복 값은 암호화된 출입증에 싣는다. 서버에 따로 둘 곳이 없어도 되고, 다른 브라우저가 가로채 쓰지 못한다
    req.session.set('sso', 왕복);
    return reply.redirect(url);
  });

  app.get('/auth/sso/callback', async (req, reply) => {
    const 왕복 = req.session.get('sso');
    // 한 번 쓴 왕복 값은 바로 지운다 — 같은 code 로 두 번 들어오지 못하게
    req.session.set('sso', undefined);
    if (왕복 === undefined) return reply.redirect(첫화면('failed'));

    let 사람;
    try {
      사람 = await 교환(sso, new URL(sso.publicUrl + req.url), 왕복);
    } catch (err) {
      // 사람에게는 「다시 시도」만 보인다. 원인(state 불일치 · Auth_platform 다운 · 서명 오류)은 로그에 남긴다
      req.log.warn({ err }, '[SSO] code 교환 실패');
      return reply.redirect(첫화면('failed'));
    }

    const 계정 = await 계정찾기(사람.sub, 사람.username, 사람.displayName);
    if (계정 === 'username') return reply.redirect(첫화면('username'));
    // 비활성 계정도 승인 대기와 같은 답이다 — 계정 상태를 밖으로 갈라 주지 않는다 (§7 로그인과 같은 규칙)
    if (!계정.is_approved || !계정.is_active) return reply.redirect(첫화면('pending'));

    req.session.set('username', 계정.username);
    req.session.set('method', 'sso');
    req.session.set('idToken', 사람.idToken);
    req.session.set('stamp', undefined);
    return reply.redirect('/');
  });
}
