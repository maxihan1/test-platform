import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 없는번호, 우편들지우기, 우편만들기, 우편저장데이터 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-142',
  name: '없는 받는 캐릭터 번호로 우편을 만들면 막히지 않고 200 과 id 가 돌아온다',
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
  const 우편들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('없는 캐릭터 번호를 받는 캐릭터로 넣어 POST /api/createmailmessage 를 부른다', async () => {
      const 응답 = await 우편만들기(request, 토큰, 없는번호(), 우편저장데이터('[QA] 우편 fn142'));
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 우편들.push(번호);
      const 코드 = await verify('POST /api/createmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 있음 = await verify('응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true);
      await verify('없는 받는 캐릭터 번호로 우편을 만들면 막히지 않고 200 과 id 가 돌아온다', 코드 && 있음, true);
    });
  } finally {
    await 우편들지우기(request, 토큰, 우편들);
  }
});
