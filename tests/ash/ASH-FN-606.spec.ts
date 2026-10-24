import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 새캐릭터, 순간이동, 스폰하나, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거리, 게임위치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-606',
  name: '임프에게 8m 안으로 다가가면 임프가 쫓아온다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 임프 스폰 가까이에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 몬스터)',
  elements: ['monster:Imp'],
  params: z.object({
    임프: z.string().describe('임프 오브젝트 주소 — 게임 화면에서 읽는다'),
    다가갈거리: z.number().min(1).max(8).describe('임프와 떨어질 거리(m) — 어그로 거리 8 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  let 임프처음 = { x: 0, z: 0 };
  let 곳 = { x: 0, z: 0 };
  try {
    await test.step('새 캐릭터를 임프 스폰 가까이에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa606');
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      await 순간이동(admin, 나, { x: 스폰.x + 12, z: 스폰.z });
    });

    await test.step('임프가 월드에 있는지 확인한다', async () => {
      await verify('월드에 임프가 있다', (await game.find(params.임프)) !== null, true, { blocker: true });
      임프처음 = await 게임위치(game, params.임프);
    });

    await test.step('임프에게 8m 안으로 다가간다', async () => {
      곳 = { x: 임프처음.x + params.다가갈거리, z: 임프처음.z };
      await 순간이동(admin, 나!, 곳);
      const 옮긴자리 = await 될때까지(async () => {
        const 지금 = await 게임위치(game, params.임프);
        return 지금.x !== 임프처음.x || 지금.z !== 임프처음.z ? 지금 : undefined;
      }, 15_000);
      await verify('임프에게 8m 안으로 다가가면 임프가 쫓아온다', 거리(옮긴자리, 곳) < 거리(임프처음, 곳), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
