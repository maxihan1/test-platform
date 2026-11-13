import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-576',
  name: '공지가 여러 개면 10초마다 다음 공지로 넘긴다',
  platforms: ['android'],
  precondition: ['공지가 두 개 켜져 있다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('로그인 화면 공지 띠를 지켜본다', async () => {
    await 로그인화면까지(game);
    await verify('공지가 여러 개면 10초마다 다음 공지로 넘긴다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
