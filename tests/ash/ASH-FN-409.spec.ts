import { defineCase, test, verify } from '@platform/kit';

import { 삭제포함찾기, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 인증머리, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-409',
  name: '캐릭터를 지우면 204 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn409');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('캐릭터를 지운다', async () => {
      const 나 = 누구!;
      const 응답 = await request.delete(`/characters/${String(나.번호)}`, { headers: 인증머리(나) });
      await verify('캐릭터를 지우면 204 다', 응답.status(), 204);
    });
    await test.step('지운 캐릭터를 어드민 캐릭터 찾기로 받는다', async () => {
      const 나 = 누구!;
      const 찾은 = (await 삭제포함찾기(admin, 나.이름)).find((c) => c.id === 나.번호);
      await verify('지운 캐릭터는 어드민 목록에 deleted 가 true 로 남는다', 찾은?.deleted, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
