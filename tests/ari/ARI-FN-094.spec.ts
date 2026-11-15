import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';
import { 데이터부르기, 서버토큰, 없는번호 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-094',
  name: '캐릭터가 없는 계정 번호로 목록을 부르면 200 과 { "playerCharacters": [] } 이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    응답본문: z.string().describe('공백 없이 줄인 응답 본문').default('{"playerCharacters":[]}'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('캐릭터가 하나도 없는 계정 번호로 POST /api/getplayercharacters 를 부른다', async () => {
    const 응답 = await 데이터부르기(request, 토큰, 'getplayercharacters', { AccountId: 없는번호() });
    const 코드 = await verify('POST /api/getplayercharacters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = 응답.ok() ? JSON.stringify(await 본문JSON<unknown>(응답)) : '(본문 없음)';
    const 빈목록 = await verify('응답 본문이 기대 결과와 같다', 본문, expected.응답본문);
    await verify('캐릭터가 없는 계정 번호로 목록을 부르면 200 과 { "playerCharacters": [] } 이다', 코드 && 빈목록, true);
  });
});
