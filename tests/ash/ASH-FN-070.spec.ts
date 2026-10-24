import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 사망보고 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-070',
  name: '초록 들판에서 죽으면 캐릭터가 마을 부활 지점 (200, 30) 으로 옮겨진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 (100, 120) 에 있다'],
  elements: ['move:생존 죽음→마을', 'respawn:마을', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 (100, 120) 으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn070');
      await 순간이동(admin, 누구, { x: 100, z: 120 });
    });
    await test.step('새 전사 캐릭터가 초록 들판 (100, 120) 에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('새 전사 캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 결과 = await 사망보고(request, 누구!, { x: 100, z: 120 });
      const 가로 = await verify('부활 위치의 X 가 200 이다', 결과.character.position.x, 200);
      const 세로 = await verify('부활 위치의 Z 가 30 이다', 결과.character.position.z, 30);
      await verify('초록 들판에서 죽으면 캐릭터가 마을 부활 지점 (200, 30) 으로 옮겨진다', 가로 && 세로, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
