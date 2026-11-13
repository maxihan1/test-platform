import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-021',
  name: '없는 아이디로 「게임 시작」을 누르면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    없는아이디: z.string().describe('없는 아이디 — 가입되지 않은 아이디').default('qa_nouser_zz9'),
    틀린비밀번호: z.string().describe('틀린 비밀번호 — 아무 글자').default('qa_nopw_zz9'),
  }),
  expected: z.object({
    창제목: z.string().describe('실패 창 제목').default('로그인 실패'),
    본문: z.string().describe('실패 창 본문').default('아이디 또는 비밀번호가 맞지 않습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('없는 아이디와 비밀번호를 넣고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
  });

  await test.step('실패 창을 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 제목 = await 화면.안내창.뜨는지(expected.창제목);
    const 본문 = await 화면.안내창.본문이될때까지(expected.본문, 10_000);
    await verify('없는 아이디로 「게임 시작」을 누르면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', 제목 && 본문, true);
  });
});
