import { defineCase, test, verify } from '@platform/kit';

import { 응답글, 틀린기본인증 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-234',
  name: '틀린 클라이언트 아이디 · 비밀값으로 토큰을 폐기하면 401 invalid_client 다',
  apiDoc: 1,
  precondition: ['등록되지 않은 클라이언트 아이디 · 비밀값이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('틀린 클라이언트 아이디 · 비밀값으로 토큰을 폐기한다', async () => {
    const res = await request.post('/v1/oauth/revoke', {
      form: { token: 'dmn-not-issued' },
      headers: { Authorization: 틀린기본인증() },
    });
    await verify('틀린 클라이언트 아이디 · 비밀값으로 토큰을 폐기하면 401 invalid_client 다', await 응답글(res), '401 invalid_client');
  });
});
