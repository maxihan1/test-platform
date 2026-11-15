import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 친구목록전체, 캐릭터들지우기, 캐릭터만들기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-079',
  name: '캐릭터를 만들면 그 캐릭터의 친구 목록이 saveData 빈 문자열로 같이 생긴다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    친구목록저장데이터: z.string().describe('새 캐릭터의 친구 목록 saveData').default(''),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 계정번호 = 시험계정번호();
  const 이름 = 고유캐릭터이름('fn079');
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('캐릭터를 만든 뒤 POST /api/getfriendlists 를 부른다', async () => {
      const 번호 = await 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름));
      if (번호 > 0) 만든것.push(번호);
      await verify('캐릭터를 만들었다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      const 줄 = (await 친구목록전체(request, 토큰)).find((f) => f.playerCharacterId === 번호);
      const 있음 = await verify('만든 캐릭터의 친구 목록 줄이 목록에 있다', 줄 !== undefined, true);
      const 빈글 = await verify('친구 목록 saveData 가 기대 결과와 같다', 줄?.saveData ?? '(줄 없음)', expected.친구목록저장데이터);
      await verify('캐릭터를 만들면 그 캐릭터의 친구 목록이 saveData 빈 문자열로 같이 생긴다', 있음 && 빈글, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
