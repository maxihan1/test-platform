import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-011',
  name: '접속에 실패해 연결이 끝나면 「게임 시작」 버튼이 다시 눌린다',
  platforms: ['android'],
  precondition: ['와이파이가 끊긴 채 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      await test.step('와이파이가 끊긴 채 로그인해 접속 실패 창을 닫는다', async () => {
        await 화면.로그인(아이디, 비밀번호);
        const 창 = await 접속안내창.제목이될때까지(game, '접속 실패', 60_000);
        await 창?.확인누르기();
        await verify('접속에 실패해 연결이 끝나면 「게임 시작」 버튼이 다시 눌린다', await 화면.게임시작눌림(), true);
        await verify('「서버에 접속하는 중…」 표시 글이 지워진다', await 화면.상태줄글(), '');
      });
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
