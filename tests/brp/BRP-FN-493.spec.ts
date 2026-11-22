import { defineCase, test, verify } from '@platform/kit';

import { 오른쪽아래인가, 자리읽기 } from './helpers/screen-check.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-493',
  name: '로그인 화면 오른쪽 아래를 읽으면 로그인 화면 오른쪽 아래에 버전 표기 「v0.1 · Unity Boss Room 기반」이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('로그인 화면 오른쪽 아래를 읽는다', async () => {
    const 위치 = await verify('버전 표기가 오른쪽 아래에 있다', 오른쪽아래인가(await 자리읽기(game, 로그인화면.버전표기)), true);
    const 글 = await verify('버전 표기가 「v0.1 · Unity Boss Room 기반」이다', await 화면.버전글(), 'v0.1 · Unity Boss Room 기반');
    await verify('로그인 화면 오른쪽 아래를 읽으면 로그인 화면 오른쪽 아래에 버전 표기 「v0.1 · Unity Boss Room 기반」이 보인다', 위치 && 글, true);
  });
});
