import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-078',
  name: '「Aria」가 있을 때 「aria」로 캐릭터를 만들면 400 으로 실패한다',
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
  const 이름 = `Aria_qa_fn078_${고유값()}`;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('「Aria」로 시작하는 이름의 캐릭터를 만든 뒤 같은 이름을 소문자로 바꿔 만든다', async () => {
      const 먼저 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름));
      if (먼저 > 0) 만든것.push(먼저);
      await verify('「Aria」로 시작하는 이름의 캐릭터를 만들었다', Number.isInteger(먼저) && 먼저 > 0, true, { blocker: true });
      const 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 이름.toLowerCase());
      const 나중 = await 번호받기(응답);
      if (나중 > 0) 만든것.push(나중);
      await verify('「Aria」가 있을 때 「aria」로 캐릭터를 만들면 400 으로 실패한다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
