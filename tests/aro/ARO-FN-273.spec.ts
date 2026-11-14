import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유, 적용중찾기 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-273',
  name: '이미 해제한 정지를 API 로 다시 해제하면 「이미 끝났거나 해제된 제재입니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 계정 = 0;
  let 제재번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸었다 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      제재번호 = await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-273'));
      await 제재해제(page, 제재번호, '[QA] ARO-FN-273 첫 해제');
    });

    await test.step('걸었다 푼 정지를 확인한다', async () => {
      await verify('해제한 정지가 적용 중이 아니다', (await 적용중찾기(page, 계정, 'SUSPEND')) === null, true, { blocker: true });
    });

    await test.step('API 로 이미 해제한 정지를 다시 해제한다', async () => {
      const 응답 = await 제재해제(page, 제재번호, '[QA] ARO-FN-273 다시 해제');
      const 코드 = await verify('응답 코드가 409 이다', 응답.status, 409);
      const 문구 = await verify('안내 문구가 「이미 끝났거나 해제된 제재입니다」다', 응답.body.message, '이미 끝났거나 해제된 제재입니다');
      await verify('이미 해제한 정지를 API 로 다시 해제하면 「이미 끝났거나 해제된 제재입니다」가 온다', 코드 && 문구, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
