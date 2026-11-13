import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-466',
  name: '캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림을 띄운다',
  platforms: ['android'],
  precondition: ['캐릭터 불러오기가 실패한다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
  held: '보류 — 게임 API 실패를 만드는 길 없음(게임 서버 응답은 모킹할 수 없다)',
});

test(spec, async ({ game }) => {
  await test.step('「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림을 띄운다', await 뜨는지(game, 화면글자('캐릭터 정보를 불러오지 못했습니다')), true);
  });
});
