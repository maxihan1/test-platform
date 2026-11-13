import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-452',
  name: '허용 계정으로 「게임 시작」을 누르면 운영툴에 적은 점검 허용 계정은 점검 중에도 로그인하고 머문다',
  platforms: ['android'],
  precondition: ['서버가 점검 중이고 계정이 허용 계정이다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('허용 계정으로 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('허용 계정으로 「게임 시작」을 누르면 운영툴에 적은 점검 허용 계정은 점검 중에도 로그인하고 머문다', await 뜨는지(game, 화면글자('게임 시작')), true);
  });
});
