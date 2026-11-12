import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 목록만들기, 목록지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-664',
  name: '팔로우하지 않는 계정을 리스트에 넣으면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원이 만든 리스트가 있다', '시드 계정 spam_shop 이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 목록 = '';
  try {
    목록 = await 목록만들기(request, 토큰);
    const 대상 = await 계정번호(request, 'spam_shop');
    await test.step('준비한 리스트를 확인한다', async () => {
      await verify('일반 회원이 만든 리스트가 있다', 목록 !== '', true, { blocker: true });
      await verify('시드 계정 spam_shop 이 있다', 대상 !== '', true, { blocker: true });
    });
    await test.step('팔로우하지 않는 spam_shop 을 리스트에 넣는다', async () => {
      const 응답 = await request.post(`/api/v1/lists/${목록}/accounts`, { headers: 머리(토큰), data: { account_ids: [대상] } });
      await verify('팔로우하지 않는 계정을 리스트에 넣으면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 목록지우기(request, 토큰, 목록);
  }
});
