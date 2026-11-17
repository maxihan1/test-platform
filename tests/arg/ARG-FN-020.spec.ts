import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-020',
  name: '없는 아이디로 로그인하면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
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

  await test.step('없는 아이디와 아무 비밀번호로 로그인한다', async () => {
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
    const 창 = await 접속안내창.제목이될때까지(game, '로그인 실패');
    const 제목 = await verify('「로그인 실패」 창이 보인다', (await 창?.제목글()) === '로그인 실패', true);
    const 본문 = (await 창?.본문글()) ?? '';
    const 글1 = await verify('창에 「아이디 또는 비밀번호가 맞지 않습니다」 문구가 보인다', 본문.includes('아이디 또는 비밀번호가 맞지 않습니다'), true);
    await verify('없는 아이디로 로그인하면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', 제목 && 글1, true);
  });
});
