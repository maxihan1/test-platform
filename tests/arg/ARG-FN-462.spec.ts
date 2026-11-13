import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-462',
  name: '시작 지급은 골드를 200 으로 맞춘다(이미 200 보다 많으면 그대로)',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 계정이다'],
  params: null,
  expected: null,
  held: '보류 — 캐릭터 없는 신규 계정을 만드는 길 없음',
});

test(spec, async ({ game }) => {
  await test.step('그 계정으로 처음 로그인하고 상단 바 골드를 확인한다', async () => {
    await 로그인화면까지(game);
    await verify('시작 지급은 골드를 200 으로 맞춘다(이미 200 보다 많으면 그대로)', await 있는지(game, 로그인화면.게임시작), true);
  });
});
