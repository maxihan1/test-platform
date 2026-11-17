import { defineCase, test, verify } from '@platform/kit';

import { 자리가맞나 } from './helpers/connect.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-300',
  name: '로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면 오른쪽 아래를 확인한다', async () => {
    const 글 = await verify('버전 글이 「v0.1 · Unity Boss Room 기반」이다', await 화면.글(로그인화면.버전), 'v0.1 · Unity Boss Room 기반');
    const 자리 = await verify('버전 글이 오른쪽 아래에 있다', await 자리가맞나(game, 로그인화면.버전, '오른쪽', '아래'), true);
    await verify('로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다', 글 && 자리, true);
  });
});
