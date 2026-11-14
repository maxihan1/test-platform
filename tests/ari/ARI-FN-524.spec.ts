import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버토큰, 전체캐릭터목록, 친구목록전체, 캐릭터지우기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-524',
  name: '친구 목록이 없는 캐릭터를 삭제하면 캐릭터만 삭제된 채 400 이다',
  apiDoc: 2,
  held: '보류 — 친구 목록 없는 캐릭터를 만드는 API 가 없다',
  precondition: ['「게임 서버」 계정이 있다', '친구 목록이 없는 캐릭터가 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    캐릭터번호: z.number().describe('친구 목록이 없는 캐릭터 번호 — 지워도 되는 캐릭터'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('고른 캐릭터에 친구 목록이 없는지 확인한다', async () => {
    const 캐릭터있음 = (await 전체캐릭터목록(request, 토큰)).some((c) => c.id === params.캐릭터번호);
    await verify('고른 캐릭터가 캐릭터 목록에 있다', 캐릭터있음, true, { blocker: true });
    const 친구목록있음 = (await 친구목록전체(request, 토큰)).some((f) => f.playerCharacterId === params.캐릭터번호);
    await verify('고른 캐릭터의 친구 목록이 없다', 친구목록있음, false, { blocker: true });
  });
  await test.step('친구 목록이 없는 캐릭터를 POST /api/deleteplayercharacter 로 삭제한다', async () => {
    const 응답 = await 캐릭터지우기(request, 토큰, params.캐릭터번호);
    const 코드 = await verify('POST /api/deleteplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 남음 = (await 전체캐릭터목록(request, 토큰)).some((c) => c.id === params.캐릭터번호);
    const 지워짐 = await verify('고른 캐릭터가 캐릭터 목록에서 사라졌다', 남음, false);
    await verify('친구 목록이 없는 캐릭터를 삭제하면 캐릭터만 삭제된 채 400 이다', 코드 && 지워짐, true);
  });
});
