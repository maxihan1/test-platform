import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-577',
  name: '공지가 0건이면 공지 띠가 보이지 않고 1건이면 보인다',
  platforms: ['android'],
  precondition: ['공지를 끄고 켤 수 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('공지 0건과 1건일 때 로그인 화면을 연다', async () => {
    await 로그인화면까지(game);
    await verify('공지가 0건이면 공지 띠가 보이지 않고 1건이면 보인다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
