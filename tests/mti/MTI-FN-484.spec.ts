import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험태그만들기, 시험태그지우기 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-484',
  name: 'POST /api/v1/admin/trends/tags/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '일반 회원 토큰이 있다', '시험 태그가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 태그 = await 시험태그만들기(request, 토큰);
  try {
    await test.step('시험 태그 번호를 확인한다', async () => {
      await verify('시험 태그가 있다', 태그.번호 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/admin/trends/tags/{id}/reject 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post(`/api/v1/admin/trends/tags/${태그.번호}/reject`);
      await verify('POST /api/v1/admin/trends/tags/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 시험태그지우기(request, 토큰, 태그);
  }
});
