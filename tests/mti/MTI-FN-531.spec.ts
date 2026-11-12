import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-531',
  name: 'id[] 를 두 번 붙여 계정을 부르면 계정 2개가 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo 와 minjun_dev 가 있다'],
  params: null,
  expected: z.object({
    계정수: z.number().describe('돌아온 계정 수').default(2),
  }),
});

test(spec, async ({ request, expected }) => {
  const 첫째 = await 계정번호(request, 'hana_photo');
  const 둘째 = await 계정번호(request, 'minjun_dev');
  await test.step('시드 계정 둘을 확인한다', async () => {
    await verify('시드 계정 hana_photo 와 minjun_dev 가 있다', 첫째 !== '' && 둘째 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/accounts?id[]=…&id[]=… 로 시드 계정 둘을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts?id[]=${첫째}&id[]=${둘째}`);
    const 몸 = (await 응답.json()) as unknown[];
    await verify('id[] 를 두 번 붙여 계정을 부르면 계정 2개가 온다', Array.isArray(몸) ? 몸.length : -1, expected.계정수);
  });
});
