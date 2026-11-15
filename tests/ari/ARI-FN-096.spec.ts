import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 전체캐릭터목록, 캐릭터들지우기, 캐릭터만들기, 데이터부르기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-096',
  name: '모든 캐릭터 목록을 부르면 200 과 서로 다른 계정에 만든 캐릭터 둘이 다 들어 있다',
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
  const 계정A = 시험계정번호();
  const 계정B = 계정A + 1;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('서로 다른 계정 번호로 캐릭터를 하나씩 만든 뒤 POST /api/getallplayercharacters 를 부른다', async () => {
      const 번호A = await 번호받기(await 캐릭터만들기(request, 토큰, 계정A, 고유캐릭터이름('fn096a')));
      if (번호A > 0) 만든것.push(번호A);
      const 번호B = await 번호받기(await 캐릭터만들기(request, 토큰, 계정B, 고유캐릭터이름('fn096b')));
      if (번호B > 0) 만든것.push(번호B);
      await verify('서로 다른 계정 번호로 캐릭터를 하나씩 만들었다', 번호A > 0 && 번호B > 0, true, { blocker: true });
      const 응답 = await 데이터부르기(request, 토큰, 'getallplayercharacters');
      const 코드 = await verify('POST /api/getallplayercharacters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await 전체캐릭터목록(request, 토큰);
      const 둘다 = await verify('돌아온 목록에 서로 다른 계정의 캐릭터 둘이 다 들어 있다', 목록.some((c) => c.id === 번호A && c.accountId === 계정A) && 목록.some((c) => c.id === 번호B && c.accountId === 계정B), true);
      await verify('모든 캐릭터 목록을 부르면 200 과 서로 다른 계정에 만든 캐릭터 둘이 다 들어 있다', 코드 && 둘다, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
