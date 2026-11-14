import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 서버토큰, 시험계정번호, 없는번호, 친구목록저장, 친구목록전체, 캐릭터들지우기, 캐릭터만들고번호 } from './helpers/data.helper.js';
import { 친구저장데이터 } from './helpers/save-data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-111',
  name: '없는 캐릭터를 친구로 넣어 저장하면 막히지 않고 200 이다',
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
  let 캐릭터번호 = 0;
  const 계정번호 = 시험계정번호();
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('캐릭터를 만들어 서버가 같이 만든 친구 목록을 찾는다', async () => {
      캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 계정번호, 고유캐릭터이름('fn111'));
      if (캐릭터번호 > 0) 만든것.push(캐릭터번호);
      await verify('캐릭터를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(캐릭터번호) && 캐릭터번호 > 0, true, { blocker: true });
      const 목록 = await 친구목록전체(request, 토큰);
      await verify('만든 캐릭터의 친구 목록이 있다', 목록.some((f) => f.playerCharacterId === 캐릭터번호), true, { blocker: true });
    });
    await test.step('없는 캐릭터 번호를 친구로 넣어 POST /api/savefriendlist 를 부른다', async () => {
      const 응답 = await 친구목록저장(request, 토큰, 캐릭터번호, 친구저장데이터([없는번호()]));
      await verify('없는 캐릭터를 친구로 넣어 저장하면 막히지 않고 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
