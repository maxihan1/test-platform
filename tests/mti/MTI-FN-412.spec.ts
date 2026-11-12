import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 신고닫기, 신고하기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-412',
  name: 'PUT /api/v1/admin/reports/{id} 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '일반 회원 토큰이 있다', '일반 회원이 낸 시험 신고가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 대상 = await 계정번호(request, 'spam_shop');
  const 신고 = await 신고하기(request, 토큰, 대상);
  try {
    await test.step('시험 신고 번호를 확인한다', async () => {
      await verify('일반 회원이 낸 시험 신고가 있다', 신고 !== '', true, { blocker: true });
    });
    await test.step('PUT /api/v1/admin/reports/{id} 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.put(`/api/v1/admin/reports/${신고}`, { data: { category: 'spam' } });
      await verify('PUT /api/v1/admin/reports/{id} 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 신고닫기(admin, 신고);
  }
});
