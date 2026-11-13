import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-447',
  name: '정지 상태 계정으로 로그인하면 「이용 정지 계정」 창으로 거절하고 본문에 「운영 정책에 따라 이용이 정지된 계정입니다」와 다음 줄에 「사유: <사유>」를 보여 준다',
  platforms: ['android'],
  precondition: ['로그인할 계정이 정지돼 있다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('정지된 계정으로 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('정지 상태 계정으로 로그인하면 「이용 정지 계정」 창으로 거절하고 본문에 「운영 정책에 따라 이용이 정지된 계정입니다」와 다음 줄에 「사유: <사유>」를 보여 준다', await 뜨는지(game, 화면글자('이용 정지 계정')), true);
  });
});
