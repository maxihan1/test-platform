import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-556',
  name: '관리 도메인 차단 목록을 limit=500 으로 부르면 500개 이하로 온다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(500).describe('안쪽 시험 한도 — 1에서 500 사이').default(500),
    바깥한도: z.number().int().min(501).describe('바깥 시험 한도 — 501 이상').default(501),
  }),
  expected: z.object({
    최대차단수: z.number().describe('한 쪽 최대 차단 수').default(500),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('GET /api/v1/admin/domain_blocks?limit=500 을 부른다', async () => {
    const 응답 = await admin.get(`/api/v1/admin/domain_blocks?limit=${params.안쪽한도}`);
    const 몸 = (await 응답.json()) as unknown[];
    await verify('관리 도메인 차단 목록을 limit=500 으로 부르면 500개 이하로 온다', 몸.length <= expected.최대차단수, true);
  });
  await test.step('GET /api/v1/admin/domain_blocks?limit=501 을 부른다', async () => {
    const 응답 = await admin.get(`/api/v1/admin/domain_blocks?limit=${params.바깥한도}`);
    const 몸 = (await 응답.json()) as unknown[];
    await verify('관리 도메인 차단 목록 limit=501 응답이 500개 이하다', 몸.length <= expected.최대차단수, true);
  });
});
