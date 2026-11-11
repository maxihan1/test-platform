import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-534',
  name: '계정을 부르면 id 가 숫자로만 된 문자열이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo 가 있다'],
  params: null,
  expected: z.object({
    숫자문자열: z.boolean().describe('id 가 숫자로만 된 문자열인지').default(true),
  }),
});

test(spec, async ({ request, expected }) => {
  const 번호 = await 계정번호(request, 'hana_photo');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/accounts/{id} 로 시드 계정을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${번호}`);
    const 몸 = (await 응답.json()) as { id?: unknown };
    await verify('계정을 부르면 id 가 숫자로만 된 문자열이다', typeof 몸.id === 'string' && /^[0-9]+$/.test(몸.id), expected.숫자문자열);
  });
});
