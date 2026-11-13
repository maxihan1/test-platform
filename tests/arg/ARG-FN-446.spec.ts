import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-446',
  name: '비밀번호 칸에서 엔터를 누르면 「게임 시작」을 누른 것과 같다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
  held: '보류 — 엔터 키를 보내는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game }) => {
  await test.step('비밀번호 칸에서 엔터를 친다', async () => {
    await 로그인화면까지(game);
    await verify('비밀번호 칸에서 엔터를 누르면 「게임 시작」을 누른 것과 같다', await 뜨는지(game, 화면글자('게임 시작')), true);
  });
});
