import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-592',
  name: '팔로잉 7,500명에서 팔로우하면 응답 코드가 422 다',
  apiDoc: 1,
  held: '보류 — 팔로우할 계정이 서버에 7,500명 없다',
  precondition: ['팔로잉이 7,500명인 계정이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
    팔로잉상한: z.number().describe('팔로잉 상한').default(7500),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 계정번호(request, 'promo_lee');
  try {
    await test.step('팔로잉 수를 확인한다', async () => {
      const 내용 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(토큰) });
      const 몸 = (await 내용.json()) as { following_count?: number };
      await verify('팔로잉이 7,500명인 계정이 있다', (몸.following_count ?? 0) >= expected.팔로잉상한, true, { blocker: true });
    });
    await test.step('팔로잉 7,500명인 계정으로 POST /api/v1/accounts/{id}/follow 를 부른다', async () => {
      const 응답 = await request.post(`/api/v1/accounts/${번호}/follow`, { headers: 머리(토큰) });
      await verify('팔로잉 7,500명에서 팔로우하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 계정동작(request, 토큰, 번호, 'unfollow');
  }
});
