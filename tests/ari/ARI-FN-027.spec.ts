import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 인증헤더 } from './helpers/api.helper.js';
import { 서버토큰, 응답글 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-027',
  name: '게임 서버 토큰으로 /opsapi/* 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('서버 토큰으로 GET /opsapi/summary 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/summary', { headers: 인증헤더(토큰) });
    const 코드 = await verify('/opsapi/summary 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('/opsapi/summary 응답 본문이 비어 있다', await 응답글(응답), '');
    await verify('게임 서버 토큰으로 /opsapi/* 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
