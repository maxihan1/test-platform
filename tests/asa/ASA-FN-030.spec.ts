import { defineCase, test, verify } from '@platform/kit';

import { 갱신, 무작위글자, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-030',
  name: '받은 적 없는 리프레시 토큰으로 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['받은 적 없는 리프레시 토큰이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('받은 적 없는 글자를 리프레시 토큰으로 보낸다', async () => {
    const 응답 = await 갱신(request, `asa-${무작위글자(32)}`);
    const 코드 = await verify('받은 적 없는 토큰 갱신 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('받은 적 없는 토큰 갱신 오류 코드가 「INVALID_REFRESH_TOKEN」이다', await 오류코드(응답), 'INVALID_REFRESH_TOKEN');
    await verify('받은 적 없는 리프레시 토큰으로 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다', 코드 && 오류, true);
  });
});
