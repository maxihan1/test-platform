import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-555',
  name: '관리 계정 목록을 limit=200 으로 부르면 200개 이하로 온다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(200).describe('안쪽 시험 한도 — 1에서 200 사이').default(200),
    바깥한도: z.number().int().min(201).describe('바깥 시험 한도 — 201 이상').default(201),
  }),
  expected: z.object({
    최대계정수: z.number().describe('한 쪽 최대 계정 수').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('GET /api/v1/admin/accounts?limit=200 을 부른다', async () => {
    const 응답 = await admin.get(`/api/v1/admin/accounts?limit=${params.안쪽한도}`);
    const 몸 = (await 응답.json()) as unknown[];
    await verify('관리 계정 목록을 limit=200 으로 부르면 200개 이하로 온다', 몸.length <= expected.최대계정수, true);
  });
  await test.step('GET /api/v1/admin/accounts?limit=201 을 부른다', async () => {
    const 응답 = await admin.get(`/api/v1/admin/accounts?limit=${params.바깥한도}`);
    const 몸 = (await 응답.json()) as unknown[];
    await verify('관리 계정 목록 limit=201 응답이 200개 이하다', 몸.length <= expected.최대계정수, true);
  });
});
