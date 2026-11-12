import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 신고닫기 } from './helpers/admin.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-331',
  name: 'POST /api/v1/reports 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 spam_shop 가 있다'],
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
  let 신고 = '';
  try {
    await test.step('신고할 시드 계정을 확인한다', async () => {
      await verify('시드 계정 spam_shop 가 있다', 대상 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/reports 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/reports', {
        headers: 머리(토큰),
        data: { account_id: 대상, comment: 'MTI 시험 신고', category: 'other' },
      });
      await verify('POST /api/v1/reports 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { id?: string; category?: string };
      신고 = 몸.id ?? '';
      await verify('신고의 category 가 other 다', 몸.category, 'other');
    });
  } finally {
    await 신고닫기(admin, 신고);
  }
});
