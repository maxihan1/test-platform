import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기, 캐릭터저장 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-087',
  name: '다른 캐릭터가 쓰는 이름으로 저장하면 막히지 않고 200 이다',
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
  const 계정번호 = 시험계정번호();
  const 이름A = 고유캐릭터이름('fn087a');
  const 이름B = 고유캐릭터이름('fn087b');
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('캐릭터 둘을 만든 뒤 하나를 다른 캐릭터의 이름으로 저장한다', async () => {
      const 번호A = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름A));
      if (번호A > 0) 만든것.push(번호A);
      const 번호B = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름B));
      if (번호B > 0) 만든것.push(번호B);
      await verify('서로 다른 이름의 캐릭터 둘을 만들었다', 번호A > 0 && 번호B > 0, true, { blocker: true });
      const 응답 = await 캐릭터저장(request, 토큰, 번호B, 이름A, '{}');
      await verify('다른 캐릭터가 쓰는 이름으로 저장하면 막히지 않고 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
