import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-441',
  name: '두 사람이 모두 준비해 던전에 들어가면 서버에 접속한 사람은 모두 같은 로비와 같은 던전에 들어간다',
  platforms: ['android'],
  precondition: ['두 사람이 같은 서버에 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('두 사람이 모두 준비해 던전에 들어간다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('두 사람이 모두 준비해 던전에 들어가면 서버에 접속한 사람은 모두 같은 로비와 같은 던전에 들어간다', await 있는지(game, 던전.행동막대), true);
  });
});
