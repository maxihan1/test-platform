import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-460',
  name: '이미 있는 캐릭터의 이름이 비었거나 「New Player」이면 아이디로 보여 준다',
  platforms: ['android'],
  precondition: ['캐릭터 이름이 「New Player」인 계정이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('그 계정으로 로그인한다', async () => {
    await 로그인화면까지(game);
    await verify('이미 있는 캐릭터의 이름이 비었거나 「New Player」이면 아이디로 보여 준다', await 뜨는지(game, 화면글자('New Player')), true);
  });
});
