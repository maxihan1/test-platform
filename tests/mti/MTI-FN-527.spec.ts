import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 관리계정끄기, 관리계정켜기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-527',
  name: '비활성 계정 토큰으로 부르면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자를 관리 API 로 비활성으로 바꿔 두었다', '두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
    오류문구: z.string().describe('오류 문구').default('Your login is currently disabled'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 번호 = await 관리계정번호(admin, 'qa_user2');
  try {
    const 꺼짐 = await 관리계정끄기(admin, 번호);
    await test.step('비활성으로 바꾼 두 번째 사용자를 확인한다', async () => {
      await verify('두 번째 사용자를 관리 API 로 비활성으로 바꿔 두었다', 꺼짐, true, { blocker: true });
    });
    await test.step('비활성인 두 번째 사용자 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다', async () => {
      const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(토큰) });
      await verify('비활성 계정 토큰으로 부르면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('오류 문구가 「Your login is currently disabled」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 관리계정켜기(admin, 번호);
  }
});
