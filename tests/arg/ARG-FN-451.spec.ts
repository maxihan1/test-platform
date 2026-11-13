import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-451',
  name: '정지와 점검이 같이 걸려 있으면 정지 안내로 거절한다',
  platforms: ['android'],
  precondition: ['계정이 정지돼 있고 서버가 점검 중이다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('그 계정으로 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('정지와 점검이 같이 걸려 있으면 정지 안내로 거절한다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
