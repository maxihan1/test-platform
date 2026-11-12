import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 앱만들기, 앱토큰받기, 토큰폐기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-695',
  name: '범위가 모자란 토큰으로 스트림을 열면 오류 문구가 「Access token does not have the required scopes」 다',
  apiDoc: 1,
  precondition: ['read:accounts 범위만 가진 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('Access token does not have the required scopes'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read:accounts');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read:accounts');
  try {
    await test.step('시험 앱 토큰을 확인한다', async () => {
      await verify('read:accounts 범위만 가진 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('read:accounts 범위 토큰으로 GET /api/v1/streaming/public 을 부른다', async () => {
      const 응답 = await request.get('/api/v1/streaming/public', { headers: 머리(앱토큰) });
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('범위가 모자란 토큰으로 스트림을 열면 오류 문구가 「Access token does not have the required scopes」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 토큰폐기(request, 앱, 앱토큰);
  }
});
