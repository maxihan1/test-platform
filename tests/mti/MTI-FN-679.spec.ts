import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 컬렉션항목더하기, 팔로우중계정들 } from './helpers/social.helper.js';
import { 컬렉션만들기, 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-679',
  name: '컬렉션에 계정 26개째를 더하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['컬렉션에 넣을 계정이 26개 있다', '일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
  held: '보류 — 컬렉션에 넣을 계정이 서버에 26개 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 컬렉션 = '';
  try {
    컬렉션 = await 컬렉션만들기(request, 토큰);
    const 후보 = await 팔로우중계정들(request, 토큰, await 내번호(request, 토큰));
    for (const 계정 of 후보.slice(0, 25)) await 컬렉션항목더하기(request, 토큰, 컬렉션, 계정);
    await test.step('넣을 계정을 확인한다', async () => {
      await verify('컬렉션에 넣을 계정이 26개 있다', 후보.length >= 26, true, { blocker: true });
    });
    await test.step('컬렉션에 26번째 계정을 더한다', async () => {
      const 응답 = await request.post(`/api/v1/collections/${컬렉션}/items`, { headers: 머리(토큰), data: { account_id: 후보[25] } });
      await verify('컬렉션에 계정 26개째를 더하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 컬렉션지우기(request, 토큰, 컬렉션);
  }
});
