import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-439',
  name: '쪽 번호 0 으로 지급 이력 API 를 부르면 1쪽과 같은 목록이 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 번호들 = (몸: Record<string, unknown>): string => ((몸.items as { id: number }[] | undefined) ?? []).map((건) => String(건.id)).join(', ');

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
  });

  await test.step('쪽 번호 0 으로 지급 이력 API 를 부른다', async () => {
    const 첫쪽 = await opsGet(page, '/grants?page=1&size=20');
    await verify('1쪽 지급 이력이 온다', 첫쪽.status, 200, { blocker: true });
    const 영쪽 = await opsGet(page, '/grants?page=0&size=20');
    await verify('쪽 번호 0 으로 지급 이력 API 를 부르면 1쪽과 같은 목록이 온다', 번호들(영쪽.body), 번호들(첫쪽.body));
  });
});
