import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호비교, 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-539',
  name: 'max_id 로 공개 타임라인을 부르면 모든 글 번호가 max_id 보다 작다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '공개 타임라인에 글이 3개 이상 있다'],
  params: null,
  expected: z.object({
    기준이상글수: z.number().describe('max_id 이상인 글 수').default(0),
  }),
});

test(spec, async ({ request, expected }) => {
  const 목록 = await 응답번호들(request, '/api/v1/timelines/public');
  await test.step('공개 타임라인 글 번호를 확인한다', async () => {
    await verify('공개 타임라인에 글이 3개 이상 있다', 목록.length >= 3, true, { blocker: true });
  });
  await test.step('공개 타임라인 첫 글 번호를 max_id 로 GET /api/v1/timelines/public 을 다시 부른다', async () => {
    const 기준 = 목록[0] ?? '';
    const 번호들 = await 응답번호들(request, `/api/v1/timelines/public?max_id=${기준}`);
    await verify('max_id 로 공개 타임라인을 부르면 모든 글 번호가 max_id 보다 작다', 번호들.filter((번호) => 번호비교(번호, 기준) >= 0).length, expected.기준이상글수);
    await verify('응답에 글이 1개 이상 있다', 번호들.length > 0, true);
  });
});
