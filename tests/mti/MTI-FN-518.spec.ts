import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-518',
  name: 'read 범위 앱 토큰으로 GET /api/v1/accounts/{id} 를 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['read 범위만 가진 시험 앱 토큰이 있다', '시드 계정 hana_photo 가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read');
  const 번호 = await 계정번호(request, 'hana_photo');
  await test.step('준비한 값을 확인한다', async () => {
    await verify('read 범위만 가진 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    await verify('시드 계정 hana_photo 가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('read 범위 앱 토큰으로 GET /api/v1/accounts/{id} 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${번호}`, { headers: 머리(앱토큰) });
    await verify('read 범위 앱 토큰으로 GET /api/v1/accounts/{id} 를 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
