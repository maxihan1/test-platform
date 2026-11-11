import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-542',
  name: 'limit=-2 로 공개 타임라인을 부르면 글이 2개 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    글수: z.number().describe('한 쪽 글 수').default(2),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/timelines/public?limit=-2 를 부른다', async () => {
    const 번호들 = await 응답번호들(request, '/api/v1/timelines/public?limit=-2');
    await verify('limit=-2 로 공개 타임라인을 부르면 글이 2개 온다', 번호들.length, expected.글수);
  });
});
