import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-500',
  name: '처음 로그인하고 상단 바 레벨을 확인하면 시작 레벨은 1 이고 최고 레벨은 30 이다',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 계정이다'],
  params: null,
  expected: null,
  held: '보류 — 캐릭터 없는 신규 계정을 만드는 길 없음',
});

test(spec, async ({ game }) => {
  await test.step('처음 로그인하고 상단 바 레벨을 확인한다', async () => {
    await 로그인화면까지(game);
    await verify('처음 로그인하고 상단 바 레벨을 확인하면 시작 레벨은 1 이고 최고 레벨은 30 이다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
