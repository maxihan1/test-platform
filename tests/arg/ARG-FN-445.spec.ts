import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-445',
  name: '아이디 칸에서 엔터를 누르면 비밀번호 칸으로 간다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
  held: '보류 — 엔터 키를 보내는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game }) => {
  await test.step('아이디 칸에서 엔터를 친다', async () => {
    await 로그인화면까지(game);
    await verify('아이디 칸에서 엔터를 누르면 비밀번호 칸으로 간다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
