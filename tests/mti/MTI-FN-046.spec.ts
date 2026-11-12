import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-046',
  name: 'GET /api/v1/accounts?id[]={id}&id[]={id} 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo · minjun_dev 가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  let 번호 = '';
  let 번호2 = '';
  번호 = await 계정번호(request, 'hana_photo');
  번호2 = await 계정번호(request, 'minjun_dev');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo · minjun_dev 가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/accounts?id[]={id}&id[]={id} 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts?id[]=${번호}&id[]=${번호2}`);
    await verify('GET /api/v1/accounts?id[]={id}&id[]={id} 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
