import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-129',
  name: 'GET /api/v1/statuses/{id}/history 를 없는 번호로 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: null,
  expected: z.object({
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, expected }) => {
  let 번호 = '';
  번호 = await 첫공개글(request, 'hana_photo');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/statuses/{id}/history 를 없는 번호로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${없는번호}/history`);
    await verify('GET /api/v1/statuses/{id}/history 를 없는 번호로 부르면 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
