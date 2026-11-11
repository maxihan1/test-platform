import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-508',
  name: 'Authorization: Bearer 머리에 일반 회원 토큰을 넣어 부르면 응답의 username 이 qa_user1 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    사용자명: z.string().describe('일반 회원 사용자명').default('qa_user1'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('Authorization: Bearer 머리에 일반 회원 토큰을 넣어 GET /api/v1/accounts/verify_credentials 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: { Authorization: `Bearer ${토큰}` } });
    const 몸 = (await 응답.json()) as { username?: string };
    await verify('Authorization: Bearer 머리에 일반 회원 토큰을 넣어 부르면 응답의 username 이 qa_user1 이다', 몸.username, expected.사용자명);
  });
});
