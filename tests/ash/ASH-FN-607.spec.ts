import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 새캐릭터, 순간이동, 스폰하나, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거리, 게임숫자, 게임위치 } from './helpers/world.helper.js';

const 임프체력 = 60;

export const spec = defineCase({
  tcId: 'ASH-FN-607',
  name: '임프를 리쉬 반경 넘게 끌고 가면 임프가 HP 를 회복하며 스폰 지점으로 돌아간다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 임프에게 쫓기고 있다'],
  held: '보류 — 게임 창을 못 엶(월드 몬스터)',
  elements: ['monster:Imp'],
  params: z.object({
    임프: z.string().describe('임프 오브젝트 주소 — 게임 화면에서 읽는다'),
    체력칸: z.string().describe('임프 HP 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    끌고갈거리: z.number().gt(25).describe('스폰 지점에서 떨어질 거리(m) — 리쉬 반경 25 초과').default(30),
    돌아온오차: z.number().describe('스폰 지점에 돌아왔다고 보는 거리(m) — 게임 화면에서 정한다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  let 스폰자리 = { x: 0, z: 0 };
  try {
    await test.step('새 캐릭터를 임프 가까이에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa607');
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      스폰자리 = { x: 스폰.x, z: 스폰.z };
      await 순간이동(admin, 나, { x: 스폰.x + 5, z: 스폰.z });
    });

    await test.step('임프가 캐릭터를 쫓고 있는지 확인한다', async () => {
      const 쫓음 = await 될때까지(async () => {
        const 지금 = await 게임위치(game, params.임프);
        return 거리(지금, { x: 스폰자리.x + 5, z: 스폰자리.z }) < 거리(스폰자리, { x: 스폰자리.x + 5, z: 스폰자리.z }) ? 지금 : undefined;
      }, 15_000);
      await verify('임프가 스폰 지점을 벗어나 캐릭터에게 다가왔다', 거리(쫓음, 스폰자리) > 0, true, { blocker: true });
    });

    await test.step('임프를 스폰 지점에서 25m 넘게 끌고 간다', async () => {
      await 순간이동(admin, 나!, { x: 스폰자리.x + params.끌고갈거리, z: 스폰자리.z });
      const 돌아옴 = await 될때까지(async () => {
        const 지금 = await 게임위치(game, params.임프);
        return 거리(지금, 스폰자리) <= params.돌아온오차 ? 지금 : undefined;
      }, 60_000);
      const 제자리 = await verify('임프가 스폰 지점으로 돌아갔다', 거리(돌아옴, 스폰자리) <= params.돌아온오차, true);
      const 체력 = await verify('임프의 HP 가 몬스터 표 값 60 이다', await 게임숫자(game, params.임프, params.체력칸), 임프체력);
      await verify('임프를 리쉬 반경 넘게 끌고 가면 임프가 HP 를 회복하며 스폰 지점으로 돌아간다', 제자리 && 체력, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
