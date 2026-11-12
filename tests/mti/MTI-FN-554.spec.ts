import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-554',
  name: '인기 태그를 limit=20 으로 부르면 20개 이하로 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(20).describe('안쪽 시험 한도 — 1에서 20 사이').default(20),
    바깥한도: z.number().int().min(21).describe('바깥 시험 한도 — 21 이상').default(21),
  }),
  expected: z.object({
    최대태그수: z.number().describe('한 쪽 최대 태그 수').default(20),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v1/trends/tags?limit=20 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/trends/tags?limit=${params.안쪽한도}`);
    await verify('인기 태그를 limit=20 으로 부르면 20개 이하로 온다', 번호들.length <= expected.최대태그수, true);
  });
  await test.step('GET /api/v1/trends/tags?limit=21 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/trends/tags?limit=${params.바깥한도}`);
    await verify('인기 태그 limit=21 응답의 태그가 20개 이하다', 번호들.length <= expected.최대태그수, true);
  });
});
