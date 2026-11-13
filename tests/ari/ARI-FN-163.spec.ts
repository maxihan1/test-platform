import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰, 본문글, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-163',
  name: '게임 계정 토큰으로 getaccountrestrictions 를 부르면 401 과 본문 「invalid shared secret」이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
    본문: z.string().describe('응답 본문 글자').default('invalid shared secret'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「일반 회원」 게임 계정 토큰으로 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 받음 = await 게임토큰(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.post('/api/getaccountrestrictions', { headers: 인증헤더(받음.token), data: { AccountId: 1 } });
    const 코드 = await verify('/api/getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('/api/getaccountrestrictions 응답 본문이 기대 결과와 같다', (await 본문글(응답)).trim(), expected.본문);
    await verify('게임 계정 토큰으로 getaccountrestrictions 를 부르면 401 과 본문 「invalid shared secret」이다', 코드 && 본문, true);
  });
});
