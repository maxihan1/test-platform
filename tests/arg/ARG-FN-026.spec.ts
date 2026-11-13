import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-026',
  name: '접속에 실패하면 로그인 화면에 그대로 남아 「게임 시작」이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    없는아이디: z.string().describe('없는 아이디 — 가입되지 않은 아이디').default('qa_nouser_zz9'),
    틀린비밀번호: z.string().describe('틀린 비밀번호 — 아무 글자').default('qa_nopw_zz9'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('없는 아이디로 「게임 시작」을 누른 뒤 실패 창의 「확인」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
    await 화면.안내창.뜨는지('로그인 실패');
    await 화면.안내창.확인누르기();
  });

  await test.step('로그인 화면을 확인한다', async () => {
    const 남았다 = await 로그인화면.지금(game).게임시작보이는지();
    await verify('접속에 실패하면 로그인 화면에 그대로 남아 「게임 시작」이 보인다', 남았다 && !(await 있는지(game, 로비.제목)), true);
  });
});
