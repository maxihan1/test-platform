import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-580',
  name: '아이디 칸에 공백만 넣고 「게임 시작」을 누르면 빈 아이디처럼 「아이디와 비밀번호를 입력해 주세요」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    공백: z.string().describe('아이디 칸에 넣을 공백 — 공백 글자만').default('   '),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('아이디 칸에 공백만 넣고 비밀번호를 넣어 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(params.공백, 비밀번호);
    const 떴다 = await game.waitFor(로그인화면.상태줄, { text: '아이디와 비밀번호를 입력해 주세요', timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('아이디 칸에 공백만 넣고 「게임 시작」을 누르면 빈 아이디처럼 「아이디와 비밀번호를 입력해 주세요」가 뜬다', 떴다, true);
  });
});
