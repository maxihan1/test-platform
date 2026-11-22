import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-038',
  name: '「게임 시작」으로 로그인에 성공하면 로비 제목 「영웅을 선택하세요!」가 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(params.userId ?? '', params.userPassword ?? '');
    const 떴다 = await 화면.로비뜰때까지(30_000);
    await verify('로비 화면이 열린다', 떴다, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await verify('「게임 시작」으로 로그인에 성공하면 로비 제목 「영웅을 선택하세요!」가 보인다', await 로비.제목글(), '영웅을 선택하세요!');
  });
});
