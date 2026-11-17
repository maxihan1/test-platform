import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-027',
  name: '접속에 실패하면 안내 창이 뜬 채 로그인 화면에 남는다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    없는아이디: z.string().describe('서버에 없는 아이디 — 계정에 없는 이름이면 같은 결과').default('qa_nobody_probe'),
    틀린비밀번호: z.string().describe('아무 비밀번호 — 어떤 글자여도 같은 결과').default('wrong-pass-1'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
  });

  await test.step('없는 아이디로 로그인해 안내 창을 받는다', async () => {
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
    const 창 = await 접속안내창.뜰때까지(game);
    const 안내 = await verify('안내 창이 뜬다', 창 !== null, true);
    const 남음 = await verify('로그인 화면의 「게임 시작」 버튼이 그대로 보인다', await 화면.보이나(로그인화면.게임시작), true);
    await verify('접속에 실패하면 안내 창이 뜬 채 로그인 화면에 남는다', 안내 && 남음, true);
  });
});
