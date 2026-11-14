import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰, 본문글, 서명변경, 운영자토큰, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-161',
  name: '토큰 없이 POST /api/getaccountrestrictions 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다', '「일반 회원」 계정이 있다', '「운영자」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('토큰 없이 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 응답 = await request.post('/api/getaccountrestrictions', { data: { AccountId: 1 } });
    const 코드 = await verify('토큰 없는 getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('토큰 없는 getaccountrestrictions 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 POST /api/getaccountrestrictions 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('서명을 변경한 토큰으로 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 받음 = await 게임토큰(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.post('/api/getaccountrestrictions', { headers: 인증헤더(서명변경(받음.token)), data: { AccountId: 1 } });
    const 코드 = await verify('서명이 틀린 getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('서명이 틀린 getaccountrestrictions 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('서명이 틀린 토큰일 때 getaccountrestrictions 는 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('「운영자」 토큰으로 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 받음 = await 운영자토큰(request, params.opsId ?? '', params.opsPassword ?? '');
    await verify('「운영자」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.post('/api/getaccountrestrictions', { headers: 인증헤더(받음.token), data: { AccountId: 1 } });
    const 코드 = await verify('운영자 토큰 getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('운영자 토큰 getaccountrestrictions 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('운영자 토큰일 때 getaccountrestrictions 는 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
