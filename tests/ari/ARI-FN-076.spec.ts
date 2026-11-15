import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-076',
  name: '이미 있는 캐릭터 이름으로 다시 만들면 400 으로 실패한다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 계정번호 = 시험계정번호();
  const 이름 = 고유캐릭터이름('fn076');
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('서버 토큰으로 새 이름의 캐릭터를 하나 만든다', async () => {
      const 번호 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름));
      if (번호 > 0) 만든것.push(번호);
      await verify('먼저 만든 캐릭터의 응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
    });
    await test.step('이미 있는 캐릭터와 같은 이름으로 POST /api/createplayercharacter 를 부른다', async () => {
      const 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      await verify('이미 있는 캐릭터 이름으로 다시 만들면 400 으로 실패한다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
