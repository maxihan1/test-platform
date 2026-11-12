import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 추가정보만들기, 프로필되돌리기, 프로필읽기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-574',
  name: '프로필 추가 정보를 4개로 고치면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
    안쪽개수: z.number().int().min(1).describe('프로필 추가 정보 개수(허용 범위 안) — 1개 이상 4개 이하').default(4),
    바깥개수: z.number().int().min(1).describe('프로필 추가 정보 개수(허용 범위 밖) — 5개 이상').default(5),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값의 응답 코드').default(200),
    최대개수: z.number().describe('추가 정보 최대 개수').default(4),
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
    await test.step('두 번째 사용자 프로필 추가 정보를 4개로 고친다', async () => {
      const 응답 = await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { fields_attributes: 추가정보만들기(params.안쪽개수) } });
      await verify('프로필 추가 정보를 4개로 고치면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('두 번째 사용자 프로필 추가 정보를 5개로 고친다', async () => {
      await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { fields_attributes: 추가정보만들기(params.바깥개수) } });
      const 읽기 = await 프로필읽기(request, 토큰);
      await verify('추가 정보 5개 수정 뒤 추가 정보가 4개 이하다', 읽기.fields.length <= expected.최대개수, true);
    });
  } finally {
    await 프로필되돌리기(request, 토큰, 원래);
  }
});
