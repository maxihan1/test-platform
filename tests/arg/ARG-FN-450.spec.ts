import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-450',
  name: '점검이 끝나는 시각이 있으면 「서버 점검 중」 창 본문 다음 줄에 「종료 예정: <시각> (UTC)」를 보여 준다',
  platforms: ['android'],
  precondition: ['서버가 끝나는 시각이 있는 점검 중이다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('점검 중에 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('점검이 끝나는 시각이 있으면 「서버 점검 중」 창 본문 다음 줄에 「종료 예정: <시각> (UTC)」를 보여 준다', await 뜨는지(game, 화면글자('서버 점검 중')), true);
  });
});
