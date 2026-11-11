import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-565',
  name: '표시 이름 41자로 프로필을 고치면 details.display_name 첫 오류가 ERR_TOO_LONG 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    오류코드: z.string().describe('첫 오류 코드').default('ERR_TOO_LONG'),
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  await test.step('display_name 을 41자로 PATCH /api/v1/accounts/update_credentials 를 부른다', async () => {
    const 응답 = await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { display_name: 'a'.repeat(41) } });
    const 몸 = (await 응답.json()) as { details?: { display_name?: { error?: string }[] } };
    await verify('표시 이름 41자로 프로필을 고치면 details.display_name 첫 오류가 ERR_TOO_LONG 이다', 몸.details?.display_name?.[0]?.error ?? '', expected.오류코드);
    await verify('표시 이름 41자로 프로필을 고친 응답 코드가 422 다', 응답.status(), expected.응답코드);
  });
});
