import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-034',
  name: '「일반 회원」으로 POST /api/login 을 부르면 응답에 Set-Cookie 헤더가 붙는다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('「일반 회원」으로 POST /api/login 을 부른다', async () => {
    const 응답 = await 게임로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    await verify('「일반 회원」으로 POST /api/login 을 부르면 응답에 Set-Cookie 헤더가 붙는다', (응답.headers()['set-cookie'] ?? '') !== '', true);
  });
});
