import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 컬렉션항목더하기 } from './helpers/social.helper.js';
import { 컬렉션만들기, 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-358',
  name: 'POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  held: '보류 — 일반 회원을 넣을 수 있는 남의 컬렉션을 만들 길이 없다',
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 들어 있는 컬렉션 항목이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 주인토큰 = params.user2Password ?? '';
  let 컬렉션 = '';
  try {
    컬렉션 = await 컬렉션만들기(request, 주인토큰);
    const 항목 = await 컬렉션항목더하기(request, 주인토큰, 컬렉션, await 내번호(request, 토큰));
    await test.step('준비한 컬렉션 항목을 확인한다', async () => {
      await verify('일반 회원이 들어 있는 컬렉션 항목이 있다', 항목 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/collections/${컬렉션}/items/${항목}/revoke`, { headers: 머리(토큰) });
      await verify('POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 컬렉션지우기(request, 주인토큰, 컬렉션);
  }
});
