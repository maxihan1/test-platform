import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-573',
  name: '운영툴에서 공지를 켜고 1분을 지켜보면 공지는 게임 API 의 서버 상태를 로그인 없이 1분마다 다시 읽는다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('운영툴에서 공지를 켜고 1분을 지켜본다', async () => {
    await 로그인화면까지(game);
    await verify('운영툴에서 공지를 켜고 1분을 지켜보면 공지는 게임 API 의 서버 상태를 로그인 없이 1분마다 다시 읽는다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
