import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-546',
  name: '공개 타임라인을 limit=40 으로 부르면 글이 40개 이하로 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(40).describe('안쪽 시험 한도 — 1에서 40 사이').default(40),
    바깥한도: z.number().int().min(41).describe('바깥 시험 한도 — 41 이상').default(41),
  }),
  expected: z.object({
    최대글수: z.number().describe('한 쪽 최대 글 수').default(40),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v1/timelines/public?limit=40 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/timelines/public?limit=${params.안쪽한도}`);
    await verify('공개 타임라인을 limit=40 으로 부르면 글이 40개 이하로 온다', 번호들.length <= expected.최대글수, true);
  });
  await test.step('GET /api/v1/timelines/public?limit=41 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/timelines/public?limit=${params.바깥한도}`);
    await verify('공개 타임라인 limit=41 응답의 글이 40개 이하다', 번호들.length <= expected.최대글수, true);
  });
});
