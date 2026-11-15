import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 데이터부르기, 서버토큰, 시험계정번호 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-025',
  name: '게임 서버 토큰으로 데이터 API 와 getaccountrestrictions 를 부르면 200 이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('서버 토큰으로 POST /api/getguilds 와 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 길드 = await 데이터부르기(request, 토큰, 'getguilds');
    const 길드코드 = await verify('POST /api/getguilds 응답 코드가 기대 결과와 같다', 길드.status(), expected.응답코드);
    const 제한 = await 데이터부르기(request, 토큰, 'getaccountrestrictions', { AccountId: 시험계정번호() });
    const 제한코드 = await verify('POST /api/getaccountrestrictions 응답 코드가 기대 결과와 같다', 제한.status(), expected.응답코드);
    await verify('게임 서버 토큰으로 데이터 API 와 getaccountrestrictions 를 부르면 200 이다', 길드코드 && 제한코드, true);
  });
});
