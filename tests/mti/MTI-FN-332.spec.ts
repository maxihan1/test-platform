import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-332',
  name: 'POST /api/v1/reports 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '시드 계정 spam_shop 가 있다'],
  params: null,
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
  }),
});

test(spec, async ({ request, expected }) => {
  let 번호 = '';
  번호 = await 계정번호(request, 'spam_shop');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 spam_shop 가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('POST /api/v1/reports 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/reports`);
    await verify('POST /api/v1/reports 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
});
