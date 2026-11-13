import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-449',
  name: '점검 중이고 허용 계정이 아니면 로그인을 「서버 점검 중」 창으로 거절하고 본문에 운영툴에 적은 점검 안내 문구를 보여 준다',
  platforms: ['android'],
  precondition: ['서버가 점검 중이고 계정이 허용 계정이 아니다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('점검 중에 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('점검 중이고 허용 계정이 아니면 로그인을 「서버 점검 중」 창으로 거절하고 본문에 운영툴에 적은 점검 안내 문구를 보여 준다', await 뜨는지(game, 화면글자('서버 점검 중')), true);
  });
});
