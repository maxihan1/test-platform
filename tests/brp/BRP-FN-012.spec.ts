import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글색, 빨강인가 } from './helpers/screen-check.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-012',
  name: '비밀번호를 비우고 「게임 시작」을 누르면 창 아래에 빨간 글씨 「아이디와 비밀번호를 입력해 주세요」가 보인다',
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

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('비밀번호 칸을 비우고 「게임 시작」을 누른다', async () => {
    await 화면.아이디넣기(아이디);
    await 화면.비밀번호넣기('');
    await 화면.게임시작누르기();
    const 떴다 = await game.waitFor(로그인화면.상태줄, { text: '아이디와 비밀번호를 입력해 주세요', timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    const 글 = await verify('창 아래에 「아이디와 비밀번호를 입력해 주세요」가 보인다', 떴다, true);
    const 빨강 = await verify('상태 줄 글씨가 빨간색이다', 빨강인가(await 글색(game, 로그인화면.상태줄)), true);
    await verify('비밀번호를 비우고 「게임 시작」을 누르면 창 아래에 빨간 글씨 「아이디와 비밀번호를 입력해 주세요」가 보인다', 글 && 빨강, true);
  });
});
