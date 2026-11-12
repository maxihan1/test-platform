import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-553',
  name: '컬렉션 목록을 limit=100 으로 부르면 100개 이하로 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 qa_user1 이 있다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(100).describe('안쪽 시험 한도 — 1에서 100 사이').default(100),
    바깥한도: z.number().int().min(101).describe('바깥 시험 한도 — 101 이상').default(101),
  }),
  expected: z.object({
    최대컬렉션수: z.number().describe('한 쪽 최대 컬렉션 수').default(100),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 계정 = await 계정번호(request, 'qa_user1');
  await test.step('시드 계정 번호를 확인한다', async () => {
    await verify('시드 계정 qa_user1 이 있다', 계정 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/accounts/{qa_user1}/collections?limit=100 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${계정}/collections?limit=${params.안쪽한도}`);
    const 몸 = (await 응답.json()) as { collections?: unknown[] };
    await verify('컬렉션 목록을 limit=100 으로 부르면 100개 이하로 온다', (몸.collections ?? []).length <= expected.최대컬렉션수, true);
  });
  await test.step('GET /api/v1/accounts/{qa_user1}/collections?limit=101 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${계정}/collections?limit=${params.바깥한도}`);
    const 몸 = (await 응답.json()) as { collections?: unknown[] };
    await verify('컬렉션 목록 limit=101 응답이 100개 이하다', (몸.collections ?? []).length <= expected.최대컬렉션수, true);
  });
});
