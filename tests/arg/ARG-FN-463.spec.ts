import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-463',
  name: '그 계정으로 처음 로그인하고 가방 창을 열면 시작 지급으로 「체력 물약」 3개를 가방에 넣는다',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 계정이다'],
  params: null,
  expected: null,
  held: '보류 — 캐릭터 없는 신규 계정을 만드는 길 없음',
});

test(spec, async ({ game }) => {
  await test.step('그 계정으로 처음 로그인하고 가방 창을 연다', async () => {
    await 로그인화면까지(game);
    await verify('그 계정으로 처음 로그인하고 가방 창을 열면 시작 지급으로 「체력 물약」 3개를 가방에 넣는다', await 뜨는지(game, 화면글자('체력 물약')), true);
  });
});
