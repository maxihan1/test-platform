import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-453',
  name: '게임 API 가 틀림 · 정지 · 점검 밖의 응답을 주면 「접속 실패」 창에 「서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요」를 띄워 거절한다',
  platforms: ['android'],
  precondition: ['게임 API 가 오류를 준다'],
  params: null,
  expected: null,
  held: '보류 — 게임 API 실패를 만드는 길 없음(게임 서버 응답은 모킹할 수 없다)',
});

test(spec, async ({ game }) => {
  await test.step('「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('게임 API 가 틀림 · 정지 · 점검 밖의 응답을 주면 「접속 실패」 창에 「서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요」를 띄워 거절한다', await 뜨는지(game, 화면글자('접속 실패')), true);
  });
});
