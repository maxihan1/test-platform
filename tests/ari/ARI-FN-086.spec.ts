import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기, 캐릭터저장 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-086',
  name: '남의 캐릭터 번호로 저장하면 막히지 않고 200 이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 계정번호 = 시험계정번호();
  const 이름 = 고유캐릭터이름('fn086');
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('다른 계정 번호로 만든 캐릭터를 서버 토큰으로 저장한다', async () => {
      const 번호 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름));
      if (번호 > 0) 만든것.push(번호);
      await verify('다른 계정 번호로 캐릭터를 만들었다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      const 응답 = await 캐릭터저장(request, 토큰, 번호, 이름, '{"qa":"fn086"}');
      await verify('남의 캐릭터 번호로 저장하면 막히지 않고 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
