import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-579',
  name: '점검이 걸리면 공지 띠가 공지 대신 「[점검] <안내>」를 빨간 바탕으로 보여 준다',
  platforms: ['android'],
  precondition: ['서버가 점검 중이다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('로그인 화면 공지 띠를 확인한다', async () => {
    await 로그인화면까지(game);
    await verify('점검이 걸리면 공지 띠가 공지 대신 「[점검] <안내>」를 빨간 바탕으로 보여 준다', await 뜨는지(game, 화면글자('[점검]')), true);
  });
});
