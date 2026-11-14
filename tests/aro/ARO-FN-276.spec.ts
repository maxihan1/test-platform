import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet, 제재해제 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-276',
  name: '없는 제재 번호를 API 로 해제하면 「제재를 찾을 수 없습니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('운영 API 가 응답하는지 확인한다', async () => {
    await verify('운영 API 가 200 으로 응답한다', (await opsGet(page, '/summary')).status, 200, { blocker: true });
  });

  await test.step('API 로 없는 제재 번호를 해제한다', async () => {
    const 응답 = await 제재해제(page, 1_999_999_999, '[QA] ARO-FN-276 없는 제재');
    const 코드 = await verify('응답 코드가 404 이다', 응답.status, 404);
    const 문구 = await verify('안내 문구가 「제재를 찾을 수 없습니다」다', 응답.body.message, '제재를 찾을 수 없습니다');
    await verify('없는 제재 번호를 API 로 해제하면 「제재를 찾을 수 없습니다」가 온다', 코드 && 문구, true);
  });
});
