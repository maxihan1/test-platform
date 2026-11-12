import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 인기링크주소 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-193',
  name: 'GET /api/v1/timelines/link 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '인기 링크가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 주소 = await 인기링크주소(request);
  await test.step('인기 링크를 확인한다', async () => {
    await verify('인기 링크가 있다', 주소 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/timelines/link 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/timelines/link?url=${encodeURIComponent(주소)}`);
    await verify('GET /api/v1/timelines/link 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
