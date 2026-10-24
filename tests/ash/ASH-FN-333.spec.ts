import { defineCase, test, verify } from '@platform/kit';

import { 오류, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-333',
  name: '토큰 없이 캐릭터 목록을 부르면 401 「UNAUTHORIZED」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn333');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('토큰 없이 내 캐릭터 목록을 받는다', async () => {
      const 응답 = await request.get('/characters');
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 코드 = await verify('오류 코드가 「UNAUTHORIZED」이다', 본문값.code, 'UNAUTHORIZED');
      await verify('토큰 없이 캐릭터 목록을 부르면 401 「UNAUTHORIZED」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
