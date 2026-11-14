import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 고유캐릭터이름, 서버토큰, 시험계정번호, 친구목록저장, 친구목록전체, 캐릭터들지우기, 캐릭터만들고번호 } from './helpers/data.helper.js';
import { 친구저장데이터 } from './helpers/save-data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-106',
  name: '친구 목록을 저장하면 200 이고 그 캐릭터 친구 목록의 saveData 가 보낸 값으로 바뀐다',
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
      캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 계정번호, 고유캐릭터이름('fn106'));
      if (캐릭터번호 > 0) 만든것.push(캐릭터번호);
      await verify('캐릭터를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(캐릭터번호) && 캐릭터번호 > 0, true, { blocker: true });
      const 목록 = await 친구목록전체(request, 토큰);
      await verify('만든 캐릭터의 친구 목록이 있다', 목록.some((f) => f.playerCharacterId === 캐릭터번호), true, { blocker: true });
    });
    await test.step('만든 캐릭터의 친구 목록을 다른 저장 데이터로 POST /api/savefriendlist 한다', async () => {
      const 보낸값 = 친구저장데이터([고유값()]);
      const 응답 = await 친구목록저장(request, 토큰, 캐릭터번호, 보낸값);
      const 코드 = await verify('POST /api/savefriendlist 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 행 = (await 친구목록전체(request, 토큰)).find((f) => f.playerCharacterId === 캐릭터번호);
      const 바뀜 = await verify('친구 목록의 그 캐릭터 saveData 가 보낸 값과 같다', 행?.saveData ?? '', 보낸값);
      await verify('친구 목록을 저장하면 200 이고 그 캐릭터 친구 목록의 saveData 가 보낸 값으로 바뀐다', 코드 && 바뀜, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
