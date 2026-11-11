import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-547',
  name: '디렉터리를 limit=80 으로 부르면 계정이 80개 이하로 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    안쪽한도: z.number().int().min(1).max(80).describe('안쪽 시험 한도 — 1에서 80 사이').default(80),
    바깥한도: z.number().int().min(81).describe('바깥 시험 한도 — 81 이상').default(81),
  }),
  expected: z.object({
    최대계정수: z.number().describe('한 쪽 최대 계정 수').default(80),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v1/directory?limit=80 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/directory?limit=${params.안쪽한도}`);
    await verify('디렉터리를 limit=80 으로 부르면 계정이 80개 이하로 온다', 번호들.length <= expected.최대계정수, true);
  });
  await test.step('GET /api/v1/directory?limit=81 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/directory?limit=${params.바깥한도}`);
    await verify('디렉터리 limit=81 응답의 계정이 80개 이하다', 번호들.length <= expected.최대계정수, true);
  });
});
