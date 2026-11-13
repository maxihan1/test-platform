import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-574',
  name: '로그인 화면 · 로비 · 던전에서 공지 띠를 확인하면 공지 띠는 로그인 화면 위쪽과 로비 위쪽에 보이고 던전에서는 숨긴다',
  platforms: ['android'],
  precondition: ['공지가 켜져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('로그인 화면 · 로비 · 던전에서 공지 띠를 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인 화면 · 로비 · 던전에서 공지 띠를 확인하면 공지 띠는 로그인 화면 위쪽과 로비 위쪽에 보이고 던전에서는 숨긴다', await 있는지(game, 던전.행동막대), true);
  });
});
