import { defineCase, test, verify } from '@platform/kit';

import { 오류 } from './helpers/api.helper.js';
import { 리프레시, 무작위글, 어드민키상태 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-384',
  name: '무효한 리프레시 토큰으로 리프레시하면 401 「INVALID_REFRESH_TOKEN」이다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  try {
    await test.step('어드민 키로 서버 설정을 읽을 수 있는지 확인한다', async () => {
      await verify('어드민 키로 서버 설정을 읽는다', await 어드민키상태(admin), 200, { blocker: true });
    });
    await test.step('지어낸 리프레시 토큰으로 리프레시한다', async () => {
      const 응답 = await 리프레시(request, 'x' + 무작위글(40));
      const 코드인가 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름인가 = await verify('오류 코드가 「INVALID_REFRESH_TOKEN」이다', (await 오류(응답)).code, 'INVALID_REFRESH_TOKEN');
      await verify('무효한 리프레시 토큰으로 리프레시하면 401 「INVALID_REFRESH_TOKEN」이다', 코드인가 && 이름인가, true);
    });
  } finally {

  }
});
