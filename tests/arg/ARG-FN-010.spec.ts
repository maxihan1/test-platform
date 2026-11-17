import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-010',
  name: '접속하는 동안 「게임 시작」을 다시 누르려 하면 버튼이 눌리지 않는 상태다',
  platforms: ['android'],
  precondition: ['와이파이가 끊긴 채 로그인 화면이 떠 있다'],
  techniques: ['결정 테이블'],
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
      await test.step('접속하는 동안 「게임 시작」 버튼 상태를 읽는다', async () => {
        await 화면.로그인(아이디, 비밀번호);
        await game.waitFor(로그인화면.상태줄, { text: '서버에 접속하는 중', timeoutMs: 10_000 }).catch(() => undefined);
        await verify('접속하는 동안 「게임 시작」을 다시 누르려 하면 버튼이 눌리지 않는 상태다', await 화면.게임시작눌림(), false);
      });
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
