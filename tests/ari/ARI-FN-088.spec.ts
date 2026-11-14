import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 계정캐릭터목록, 번호받기, 서버토큰, 시험계정번호, 친구목록전체, 캐릭터들지우기, 캐릭터만들기, 캐릭터지우기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-088',
  name: '캐릭터를 삭제하면 200 이고 그 캐릭터가 목록에서 사라진다',
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
  const 이름 = 고유캐릭터이름('fn088');
  let 남은것: number[] = [];
  let 번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('삭제할 캐릭터를 하나 만든다', async () => {
      번호 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름));
      if (번호 > 0) 남은것 = [번호];
      await verify('만든 캐릭터의 응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      await verify('삭제 전에 그 캐릭터의 친구 목록 줄이 있다', (await 친구목록전체(request, 토큰)).some((f) => f.playerCharacterId === 번호), true, { blocker: true });
    });
    await test.step('만든 캐릭터를 POST /api/deleteplayercharacter 로 삭제한다', async () => {
      const 응답 = await 캐릭터지우기(request, 토큰, 번호);
      if (응답.ok()) 남은것 = [];
      const 코드 = await verify('POST /api/deleteplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 사라짐 = await verify('삭제한 캐릭터가 캐릭터 목록에 없다', (await 계정캐릭터목록(request, 토큰, 계정번호)).some((c) => c.id === 번호), false);
      await verify('캐릭터를 삭제하면 200 이고 그 캐릭터가 목록에서 사라진다', 코드 && 사라짐, true);
    });
    await test.step('삭제한 뒤 POST /api/getfriendlists 를 부른다', async () => {
      await verify('삭제한 캐릭터의 친구 목록도 같이 사라진다', (await 친구목록전체(request, 토큰)).some((f) => f.playerCharacterId === 번호), false);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 남은것);
  }
});
