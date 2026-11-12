import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글주소 } from './helpers/manage.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-373',
  name: 'GET /api/oembed 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 hana_photo 의 공개 글 주소가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 글 = await 첫공개글(request, 'hana_photo');
  const 주소 = await 글주소(request, 글);
  await test.step('글 주소를 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글 주소가 있다', 주소 !== '', true, { blocker: true });
  });
  await test.step('GET /api/oembed 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/oembed?url=${encodeURIComponent(주소)}`);
    await verify('GET /api/oembed 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
