import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 신고닫기 } from './helpers/admin.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 한글글자 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-672',
  name: '신고 comment 1,000자로 신고하면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 spam_shop 이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽글자수: z.number().describe('신고 comment 글자 수 — 1~1000').default(1000),
    바깥쪽글자수: z.number().describe('신고 comment 글자 수 — 1001 이상').default(1001),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값일 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('바깥쪽 값일 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 신고들: string[] = [];
  try {
    const 대상 = await 계정번호(request, 'spam_shop');
    await test.step('신고할 시드 계정을 확인한다', async () => {
      await verify('시드 계정 spam_shop 이 있다', 대상 !== '', true, { blocker: true });
    });
    await test.step('comment 1,000자로 spam_shop 을 신고한다', async () => {
      const 응답 = await request.post('/api/v1/reports', { headers: 머리(토큰), data: { account_id: 대상, comment: 한글글자(params.안쪽글자수), category: 'other' } });
      if (응답.status() === 200) 신고들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('신고 comment 1,000자로 신고하면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('comment 1,001자로 spam_shop 을 신고한다', async () => {
      const 응답 = await request.post('/api/v1/reports', { headers: 머리(토큰), data: { account_id: 대상, comment: 한글글자(params.바깥쪽글자수), category: 'other' } });
      if (응답.status() === 200) 신고들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('신고 comment 1,001자 신고의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    for (const 신고 of 신고들) await 신고닫기(admin, 신고);
  }
});
