import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-486',
  name: '살아 있는 사람이 접속을 끊으면 누가 접속을 끊어 남은 사람이 모두 쓰러진 상태가 돼도 패배로 결과 화면에 간다',
  platforms: ['android'],
  precondition: ['두 사람이 던전에 있고 한 사람이 쓰러져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('살아 있는 사람이 접속을 끊는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('살아 있는 사람이 접속을 끊으면 누가 접속을 끊어 남은 사람이 모두 쓰러진 상태가 돼도 패배로 결과 화면에 간다', await 있는지(game, 던전.행동막대), true);
  });
});
