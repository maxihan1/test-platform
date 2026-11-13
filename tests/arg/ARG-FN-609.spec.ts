import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-609',
  name: '파티는 서버 메모리에만 있어 다시 접속하면 파티가 없다',
  platforms: ['android'],
  precondition: ['파티에 들어가 있다'],
  techniques: ['상태 전이'],
  params: null,
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game }) => {
  await test.step('메인 메뉴로 나갔다가 다시 로그인한다', async () => {
    await 로그인화면까지(game);
    await verify('파티는 서버 메모리에만 있어 다시 접속하면 파티가 없다', await 있는지(game, 로그인화면.게임시작), true);
  });
});
