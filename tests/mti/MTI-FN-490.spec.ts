import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-490',
  name: 'POST /api/v1/admin/trends/statuses/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '일반 회원 토큰이 있다', '일반 회원이 쓴 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 글 = await 글쓰기(request, 토큰, { visibility: 'public' });
  try {
    await test.step('시험 글 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 공개 글이 있다', 글 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/admin/trends/statuses/{id}/approve 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post(`/api/v1/admin/trends/statuses/${글}/approve`);
      await verify('POST /api/v1/admin/trends/statuses/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 글);
  }
});
