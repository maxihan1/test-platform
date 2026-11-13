import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 적용중제재풀기, 제재걸기 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-339',
  name: 'API 로 끝 시각을 1분 전으로 정지를 걸면 「끝나는 시각은 지금보다 뒤여야 합니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('API 로 끝 시각을 1분 전으로 정지를 건다', async () => {
      const 응답 = await 제재걸기(page, 계정, { type: 'SUSPEND', reason: 시험사유('ARO-FN-339'), endsAt: new Date(Date.now() - 60_000).toISOString() });
      const 코드 = await verify('응답 코드가 400 이다', 응답.status, 400);
      const 문구 = await verify('안내 문구가 「끝나는 시각은 지금보다 뒤여야 합니다」다', 응답.body.message, '끝나는 시각은 지금보다 뒤여야 합니다');
      await verify('API 로 끝 시각을 1분 전으로 정지를 걸면 「끝나는 시각은 지금보다 뒤여야 합니다」가 온다', 코드 && 문구, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
