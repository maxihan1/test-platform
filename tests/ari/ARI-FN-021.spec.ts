import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';
import { 고유캐릭터이름, 번호받기, 데이터부르기, 서버토큰, 캐릭터들지우기, 캐릭터만들기, 캐릭터저장 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-021',
  name: '서버 토큰으로 다른 계정의 캐릭터 행을 만들고 저장하고 읽으면 모두 200 이다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 계정번호 = 0;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  try {
    await test.step('서버 토큰으로 「두 번째 플레이어」 계정에 캐릭터를 만들고 저장한 뒤 그 계정의 캐릭터 목록을 부른다', async () => {
      const 이름 = 고유캐릭터이름('fn021');
      const 만들기 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
      const 번호 = await 번호받기(만들기);
      if (번호 > 0) 만든것.push(번호);
      const 만듦 = await verify('POST /api/createplayercharacter 응답 코드가 기대 결과와 같다', 만들기.status(), expected.응답코드);
      const 저장 = await 캐릭터저장(request, 토큰, 번호, 이름, '{"qa":"fn021"}');
      const 저장함 = await verify('POST /api/saveplayercharacter 응답 코드가 기대 결과와 같다', 저장.status(), expected.응답코드);
      const 목록 = await 데이터부르기(request, 토큰, 'getplayercharacters', { AccountId: 계정번호 });
      const 읽음 = await verify('POST /api/getplayercharacters 응답 코드가 기대 결과와 같다', 목록.status(), expected.응답코드);
      await verify('서버 토큰으로 다른 계정의 캐릭터 행을 만들고 저장하고 읽으면 모두 200 이다', 만듦 && 저장함 && 읽음, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
