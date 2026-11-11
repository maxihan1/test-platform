import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 긴글, 프로필되돌리기, 프로필읽기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-572',
  name: '표시 이름을 40자로 고치면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
    안쪽글자수: z.number().int().min(1).describe('표시 이름 글자 수(허용 범위 안) — 1자 이상 40자 이하').default(40),
    바깥글자수: z.number().int().min(1).describe('표시 이름 글자 수(허용 범위 밖) — 41자 이상').default(41),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값의 응답 코드').default(200),
    바깥응답코드: z.number().describe('바깥 값의 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 원래 = await 프로필읽기(request, 토큰);
  try {
    await test.step('두 번째 사용자 토큰을 확인한다', async () => {
      await verify('두 번째 사용자 토큰이 있다', 원래.id !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자 표시 이름을 40자로 PATCH /api/v1/accounts/update_credentials 한다', async () => {
      const 응답 = await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { display_name: 긴글('', params.안쪽글자수) } });
      await verify('표시 이름을 40자로 고치면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('두 번째 사용자 표시 이름을 41자로 PATCH /api/v1/accounts/update_credentials 한다', async () => {
      const 응답 = await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { display_name: 긴글('', params.바깥글자수) } });
      await verify('표시 이름 41자 수정의 응답 코드가 422 다', 응답.status(), expected.바깥응답코드);
    });
  } finally {
    await 프로필되돌리기(request, 토큰, 원래);
  }
});
