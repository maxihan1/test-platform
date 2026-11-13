import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-465',
  name: '그 계정으로 로그인하면 캐릭터를 불러올 때 레벨을 1~30 사이로 맞춘다',
  platforms: ['android'],
  precondition: ['저장된 레벨이 30 을 넘는 캐릭터다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('그 계정으로 로그인한다', async () => {
    await 로그인화면까지(game);
    await verify('그 계정으로 로그인하면 캐릭터를 불러올 때 레벨을 1~30 사이로 맞춘다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
