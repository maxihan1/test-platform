import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰, 토큰본문 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-016',
  name: '「일반 회원」으로 로그인해 받은 게임 계정 토큰을 열면 id 가 응답의 accountId 와 같다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('「일반 회원」으로 POST /api/login 을 불러 받은 토큰 본문을 읽는다', async () => {
    const 받음 = await 게임토큰(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 본문 = 토큰본문(받음.token);
    await verify('「일반 회원」으로 로그인해 받은 게임 계정 토큰을 열면 id 가 응답의 accountId 와 같다', String(본문.id ?? ''), String(받음.accountId));
  });
});
