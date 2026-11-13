import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-201',
  name: 'GET /opsapi/grants 를 부르면 total 과 지급 건 목록 items 가 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({}),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/grants');
    const 코드 = await verify('지급 이력 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<{ total?: unknown; items?: unknown }>(응답).catch(() => ({}) as { total?: unknown; items?: unknown });
    const 합계 = await verify('응답 total 이 0 이상의 정수다', typeof 몸.total === 'number' && Number.isInteger(몸.total) && 몸.total >= 0, true);
    const 목록 = await verify('응답 items 가 목록이다', Array.isArray(몸.items), true);
    await verify('GET /opsapi/grants 를 부르면 total 과 지급 건 목록 items 가 돌아온다', 코드 && 합계 && 목록, true);
  });
});
