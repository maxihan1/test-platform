import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 인증머리, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-418',
  name: '위치를 저장하면 204 이고 캐릭터 위치가 (120, 90) 이 된다',
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
      누구 = await 새캐릭터자리(admin, 'qafn418');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('위치를 (120, 0, 90) 으로 저장한다', async () => {
      const 나 = 누구!;
      const 저장 = await request.put(`/characters/${String(나.번호)}/position`, { headers: 인증머리(나), data: { x: 120, y: 0, z: 90 } });
      const 코드 = await verify('위치 저장 응답이 204 다', 저장.status(), 204);
      const 정보 = await 내정보(request, 나);
      const 가로 = await verify('캐릭터 위치의 x 가 120 이다', 정보.position.x, 120);
      const 세로 = await verify('캐릭터 위치의 z 가 90 이다', 정보.position.z, 90);
      await verify('위치를 저장하면 204 이고 캐릭터 위치가 (120, 90) 이 된다', 코드 && 가로 && 세로, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
