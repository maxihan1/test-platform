import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-011',
  name: '아이디 앞뒤에 공백을 붙여 로그인하면 로비 제목 「영웅을 선택하세요!」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('아이디 앞뒤에 공백을 붙여 넣고 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(`  ${아이디}  `, 비밀번호);
    await verify('로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await verify('아이디 앞뒤에 공백을 붙여 로그인하면 로비 제목 「영웅을 선택하세요!」가 보인다', await 로비.제목글(), '영웅을 선택하세요!');
  });
});
