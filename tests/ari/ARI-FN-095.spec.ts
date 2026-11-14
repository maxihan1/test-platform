import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰 } from './helpers/api.helper.js';
import { 계정캐릭터목록, 데이터부르기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-095',
  name: '서버 토큰으로 남의 계정 번호의 캐릭터 목록을 부르면 200 과 그 계정의 캐릭터가 돌아온다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다', '「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  let 계정번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「일반 회원」 로그인 응답에서 계정 번호를 얻는다', async () => {
    const 회원 = await 게임토큰(request, params.playerId ?? '', params.playerPassword ?? '');
    계정번호 = 회원.accountId;
    await verify('「일반 회원」 로그인 응답 코드가 200 이다', 회원.status, 200, { blocker: true });
    await verify('「일반 회원」 계정 번호가 1 이상의 정수다', Number.isInteger(계정번호) && 계정번호 > 0, true, { blocker: true });
  });
  await test.step('서버 토큰으로 「일반 회원」 계정 번호의 캐릭터 목록을 부른다', async () => {
    const 응답 = await 데이터부르기(request, 토큰, 'getplayercharacters', { AccountId: 계정번호 });
    const 코드 = await verify('POST /api/getplayercharacters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 목록 = await 계정캐릭터목록(request, 토큰, 계정번호);
    const 있음 = await verify('돌아온 목록에 캐릭터가 하나 이상 있다', 목록.length > 0, true);
    const 그계정 = await verify('돌아온 캐릭터가 모두 그 계정의 것이다', 목록.every((c) => c.accountId === 계정번호), true);
    await verify('서버 토큰으로 남의 계정 번호의 캐릭터 목록을 부르면 200 과 그 계정의 캐릭터가 돌아온다', 코드 && 있음 && 그계정, true);
  });
});
