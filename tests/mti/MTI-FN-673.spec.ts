import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 신고닫기 } from './helpers/admin.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-673',
  name: 'violation 이 아닌 신고에 rule_ids 를 넣으면 신고의 rule_ids 가 비어 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 spam_shop 이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    규칙수: z.number().describe('신고에 든 rule_ids 개수').default(0),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 신고 = '';
  try {
    const 대상 = await 계정번호(request, 'spam_shop');
    await test.step('신고할 시드 계정을 확인한다', async () => {
      await verify('시드 계정 spam_shop 이 있다', 대상 !== '', true, { blocker: true });
    });
    await test.step('category=spam 으로 rule_ids[] 를 넣어 신고한다', async () => {
      const 응답 = await request.post('/api/v1/reports', {
        headers: 머리(토큰),
        data: { account_id: 대상, category: 'spam', rule_ids: ['1'], comment: 'MTI 시험 신고' },
      });
      const 몸 = (await 응답.json()) as { id?: string; rule_ids?: string[] | null };
      신고 = 몸.id ?? '';
      await verify('신고 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
      await verify('violation 이 아닌 신고에 rule_ids 를 넣으면 신고의 rule_ids 가 비어 있다', (몸.rule_ids ?? []).length, expected.규칙수);
    });
  } finally {
    await 신고닫기(admin, 신고);
  }
});
