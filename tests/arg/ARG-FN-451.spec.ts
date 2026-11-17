import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 빨강인가 } from './helpers/connect.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-451',
  name: '아이디 칸을 비우고 「게임 시작」을 누르면 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 빨간 글씨로 뜬다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
  });

  await test.step('아이디 칸을 비우고 「게임 시작」을 누른다', async () => {
    await 화면.아이디넣기('');
    await 화면.비밀번호넣기(비밀번호);
    await 화면.게임시작누르기();
    await game.waitFor(로그인화면.상태줄, { text: '아이디와 비밀번호를 입력해 주세요', timeoutMs: 10_000 }).catch(() => undefined);
    const 안내 = await verify('창 아래에 「아이디와 비밀번호를 입력해 주세요」가 보인다', await 화면.상태줄글(), '아이디와 비밀번호를 입력해 주세요');
    const 빨강 = await verify('안내 글씨가 빨간색이다', 빨강인가(await 화면.상태줄색()), true);
    await verify('아이디 칸을 비우고 「게임 시작」을 누르면 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 빨간 글씨로 뜬다', 안내 && 빨강, true);
  });

  await test.step('게임을 다시 켜 로그인 화면을 기다린다', async () => {
    화면 = await 게임다시켜기(driver, game);
  });
  await test.step('비밀번호 칸을 비우고 「게임 시작」을 누른다', async () => {
    await 화면.아이디넣기(아이디);
    await 화면.비밀번호넣기('');
    await 화면.게임시작누르기();
    await game.waitFor(로그인화면.상태줄, { text: '아이디와 비밀번호를 입력해 주세요', timeoutMs: 10_000 }).catch(() => undefined);
    const 안내 = await verify('비밀번호 칸이 비었을 때 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 보인다', await 화면.상태줄글(), '아이디와 비밀번호를 입력해 주세요');
    const 빨강 = await verify('비밀번호 칸이 비었을 때 안내 글씨가 빨간색이다', 빨강인가(await 화면.상태줄색()), true);
    await verify('비밀번호 칸이 비었을 때도 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 빨간 글씨로 뜬다', 안내 && 빨강, true);
  });
});
