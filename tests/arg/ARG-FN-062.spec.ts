import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-062',
  name: '탱커로 던전에 들어가면 체력 막대 최댓값이 1,200 이다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    최댓값: z.number().describe('탱커 체력 막대 최댓값').default(1200),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('탱커를 선택하고 「준비!」를 눌러 던전에 들어간 뒤 체력 막대를 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await 대기실.직업고르기('탱커');
    await 대기실.준비누르기();
    const 화면 = await 던전.열기(game);
    await 화면.초상화가채워질때까지(params.loginId ?? '');
    await verify('탱커로 던전에 들어가면 체력 막대 최댓값이 1,200 이다', await 화면.체력최댓값수(), expected.최댓값);
  });
});
