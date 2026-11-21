import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시자번호 } from './helpers/trend.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-707',
  name: 'POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '유행 링크 게시자 blog.joinmastodon.org 가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('게시자를 승인할 때 응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 게시자 = await 게시자번호(admin, 'blog.joinmastodon.org');
  await test.step('유행 링크 게시자를 확인한다', async () => {
    await verify('유행 링크 게시자 blog.joinmastodon.org 가 있다', 게시자 !== '', true, { blocker: true });
  });
  await test.step('POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부른다', async () => {
    const 응답 = await admin.post(`/api/v1/admin/trends/links/publishers/${게시자}/approve`);
    await verify('POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
