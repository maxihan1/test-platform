import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-676',
  name: '본인이 아닌 채로 컬렉션 목록을 부르면 모든 컬렉션의 discoverable 이 true 다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 qa_user1 이 있다'],
  params: null,
  expected: z.object({
    discoverable값: z.string().describe('컬렉션 목록에 보이는 discoverable 값').default('true'),
  }),
});

test(spec, async ({ request, expected }) => {
  const 계정 = await 계정번호(request, 'qa_user1');
  await test.step('컬렉션을 볼 시드 계정을 확인한다', async () => {
    await verify('시드 계정 qa_user1 이 있다', 계정 !== '', true, { blocker: true });
  });
  await test.step('토큰 없이 GET /api/v1/accounts/{qa_user1}/collections 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${계정}/collections`);
    await verify('컬렉션 목록 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 몸 = (await 응답.json()) as { collections?: { discoverable?: boolean }[] };
    const 값들 = [...new Set((몸.collections ?? []).map((컬렉션) => String(컬렉션.discoverable)))].join(', ');
    await verify('본인이 아닌 채로 컬렉션 목록을 부르면 모든 컬렉션의 discoverable 이 true 다', 값들, expected.discoverable값);
  });
});
