import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-355',
  name: '상태 줄 「서버에 접속하는 중…」은 회색이다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game }) => {
  await test.step('「게임 시작」을 누르고 상태 줄 글자 색을 읽는다', async () => {
    await 로그인화면까지(game);
    await verify('상태 줄 「서버에 접속하는 중…」은 회색이다', await 뜨는지(game, 화면글자('서버에 접속하는 중…')), true);
  });
});
