import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-128',
  name: 'GET /api/v1/statuses/{id}/history 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  let 번호 = '';
  번호 = await 첫공개글(request, 'hana_photo');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/statuses/{id}/history 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${번호}/history`);
    await verify('GET /api/v1/statuses/{id}/history 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
