import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글색, 회색인가 } from './helpers/screen-check.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-017',
  name: '「게임 시작」을 누르면 버튼 아래 상태 줄에 회색 「서버에 접속하는 중…」이 보인다',
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

  await test.step('「게임 시작」을 누른 바로 뒤 상태 줄을 읽는다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    const 글 = await verify('상태 줄 글이 「서버에 접속하는 중…」이다', 색글떼기(await 화면.상태줄글()), '서버에 접속하는 중…');
    const 회색 = await verify('상태 줄 글씨가 회색이다', 회색인가(await 글색(game, 로그인화면.상태줄)), true);
    await verify('「게임 시작」을 누르면 버튼 아래 상태 줄에 회색 「서버에 접속하는 중…」이 보인다', 글 && 회색, true);
  });
});
