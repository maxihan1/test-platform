import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-055',
  name: '「일반 회원」의 맞는 아이디와 비밀번호로 POST /api/login 을 부르면 200 과 accountId · token 이 돌아온다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「일반 회원」 아이디와 비밀번호로 POST /api/login 을 부른다', async () => {
    const 응답 = await 게임로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    const 코드 = await verify('「일반 회원」 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json().catch(() => ({}))) as { accountId?: number; token?: string };
    const 번호 = await verify('응답 accountId 가 1 이상이다', (몸.accountId ?? 0) >= 1, true);
    const 토큰 = await verify('응답 token 이 비어 있지 않다', (몸.token ?? '') !== '', true);
    await verify('「일반 회원」의 맞는 아이디와 비밀번호로 POST /api/login 을 부르면 200 과 accountId · token 이 돌아온다', 코드 && 번호 && 토큰, true);
  });
});
