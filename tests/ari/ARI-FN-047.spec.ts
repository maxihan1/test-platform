import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰, 본문글, 서명변경, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-047',
  name: '서명이 틀린 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「일반 회원」 토큰의 서명을 변경해 POST /api/getguilds 를 부른다', async () => {
    const 받음 = await 게임토큰(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.post('/api/getguilds', { headers: 인증헤더(서명변경(받음.token)), data: {} });
    const 코드 = await verify('서명을 변경한 토큰의 /api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('서명을 변경한 토큰의 /api/getguilds 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('서명이 틀린 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
