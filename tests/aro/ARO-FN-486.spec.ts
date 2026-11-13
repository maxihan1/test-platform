import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급회수 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-486',
  name: '없는 지급 번호를 API 로 회수하면 「지급 건을 찾을 수 없습니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-486');
  const 제목 = 고유글('ARO-FN-486');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('API 로 없는 지급 번호를 회수한다', async () => {
      const 응답 = await 지급회수(page, 999999999, 제목);
      await verify('없는 지급 번호를 API 로 회수하면 「지급 건을 찾을 수 없습니다」가 온다', String(응답.body.message), '지급 건을 찾을 수 없습니다');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
