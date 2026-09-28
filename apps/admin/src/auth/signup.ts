// 회원가입 POST /api/auth/signup — 로그인 없이 승인 대기 계정을 만든다 (SPEC 도메인/인증 §7 · §3.5 「계정이 생기는 길」)

import type { FastifyInstance } from 'fastify';

import { 작성계정인가 } from './agentToken.js';
import { 해시 } from './password.js';
import { 비밀번호최대, 비밀번호최소, 아이디모양, 이름최대, 이름최소 } from './rules.js';

interface 가입본문 {
  username?: unknown;
  displayName?: unknown;
  password?: unknown;
}

export default async function signupRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: 가입본문 }>('/auth/signup', async (req, reply) => {
    // role·권한 칸은 읽지 않는다 — 본인이 적은 권한이 그대로 수락되면 안 된다 (SPEC 도메인/인증 §3.5)
    const { username, displayName: 적은이름, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof 적은이름 !== 'string' || typeof password !== 'string') {
      return reply.code(400).send({ error: 'INVALID_REQUEST' });
    }
    const displayName = 적은이름.trim();
    // 요청 수 제한이 없어서 모양 → 길이 → 중복을 해시 계산보다 먼저 본다 (SPEC 도메인/인증 §7)
    if (!아이디모양.test(username)) return reply.code(400).send({ error: 'USERNAME_SHAPE' });
    if (displayName.length < 이름최소 || displayName.length > 이름최대 || password.length > 비밀번호최대) {
      return reply.code(400).send({ error: 'INVALID_REQUEST' });
    }
    if (password.length < 비밀번호최소) return reply.code(400).send({ error: 'PASSWORD_SHORT' });

    // 작성 계정 이름을 먼저 차지하면 서버가 그 계정을 에이전트로 믿는다. 있는 아이디와 같은 답으로 막는다
    if (작성계정인가(username)) return reply.code(409).send({ error: 'USERNAME_TAKEN' });

    const { pool } = await import('../db/index.js');
    const 있음 = await pool.query('SELECT 1 FROM app_user WHERE username = $1', [username]);
    if (있음.rowCount !== 0) return reply.code(409).send({ error: 'USERNAME_TAKEN' });

    // 본인이 정한 비밀번호라 변경 강제는 끈다. 로그인은 admin 이 수락해야 열린다
    const rows = await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $2, $3, 'member', 'none', false, false)
       ON CONFLICT (username) DO NOTHING`,
      [username, displayName, await 해시(password)],
    );
    // 위 확인과 넣기 사이에 같은 아이디가 먼저 들어온 경우
    if (rows.rowCount === 0) return reply.code(409).send({ error: 'USERNAME_TAKEN' });
    return reply.code(201).send({ status: 'PENDING' });
  });
}
