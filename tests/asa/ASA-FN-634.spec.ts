import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 토큰없이부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-634',
  name: '토큰 없이 POST /world/ground-items/1/pickup 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('토큰 없이 POST /world/ground-items/1/pickup 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/world/ground-items/1/pickup');
    const 코드 = await verify('POST /world/ground-items/1/pickup 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /world/ground-items/1/pickup 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /world/ground-items/1/pickup 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});
