import { defineCase, test, verify } from '@platform/kit';

import { 본문, 인증머리, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-001',
  name: '캐릭터를 (200, 30) 으로 옮기고 정보를 받으면 구역이 「Town」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn001');
    });
    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터 번호를 받았다', typeof 누구?.번호, 'number', { blocker: true });
    });
    await test.step('캐릭터를 (200, 30) 으로 옮기고 캐릭터 정보를 받는다', async () => {
      const 나 = 누구!;
      await 순간이동(admin, 나, { x: 200, z: 30 });
      const 정보 = await 본문<캐릭터정보>(await request.get(`/characters/${String(나.번호)}`, { headers: 인증머리(나) }), '캐릭터 정보');
      await verify('캐릭터를 (200, 30) 으로 옮기고 정보를 받으면 구역이 「Town」이다', 정보.zone, 'Town');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
