import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 계정캐릭터목록, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기, 캐릭터저장 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-082',
  name: '캐릭터를 저장하면 200 이고 이름과 저장 데이터가 보낸 값으로 바뀐다',
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
  const 처음이름 = 고유캐릭터이름('fn082a');
  const 바꿀이름 = 고유캐릭터이름('fn082b');
  const 바꿀데이터 = '{"qa":"fn082"}';
  const 만든것: number[] = [];
  let 번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('서버 토큰으로 새 이름의 캐릭터를 하나 만든다', async () => {
      번호 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 처음이름));
      if (번호 > 0) 만든것.push(번호);
      await verify('만든 캐릭터의 응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
    });
    await test.step('만든 캐릭터를 다른 이름과 저장 데이터로 POST /api/saveplayercharacter 한다', async () => {
      const 응답 = await 캐릭터저장(request, 토큰, 번호, 바꿀이름, 바꿀데이터);
      const 코드 = await verify('POST /api/saveplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 행 = (await 계정캐릭터목록(request, 토큰, 계정번호)).find((c) => c.id === 번호);
      const 이름 = await verify('캐릭터 이름이 보낸 이름으로 바뀌었다', 행?.name ?? '(행 없음)', 바꿀이름);
      const 데이터 = await verify('캐릭터 저장 데이터가 보낸 저장 데이터로 바뀌었다', 행?.saveData ?? '(행 없음)', 바꿀데이터);
      await verify('캐릭터를 저장하면 200 이고 이름과 저장 데이터가 보낸 값으로 바뀐다', 코드 && 이름 && 데이터, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
