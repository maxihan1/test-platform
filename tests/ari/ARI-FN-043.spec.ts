import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-043',
  name: 'POST /api/login 응답을 받으면 필드 이름이 camelCase 인 accountId · token 이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    칸이름: z.string().describe('응답 필드 이름 — 쉼표로 이어 가나다순').default('accountId,token'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「일반 회원」으로 POST /api/login 을 불러 응답 필드 이름을 읽는다', async () => {
    const 응답 = await 게임로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 칸들 = Object.keys(await 본문JSON<Record<string, unknown>>(응답)).sort().join(',');
    await verify('POST /api/login 응답을 받으면 필드 이름이 camelCase 인 accountId · token 이다', 칸들, expected.칸이름);
  });
});
