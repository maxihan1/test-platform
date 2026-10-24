import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 구역자리, 새캐릭터, 스폰목록, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 가까운스폰, 위치표본모으기, 칸값읽기, GM으로초록들판가기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-658',
  name: '리쉬 반경 넘게 끌려간 임프는 HP 를 회복하며 스폰 지점으로 돌아간다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 몬스터 HP · 위치를 읽을 게임 속성 주소를 모름',
  elements: ['monster:Imp'],
  params: z.object({
    임프주소: z.string().describe('임프 오브젝트 주소'),
    위치칸: z.string().describe('임프의 위치를 담은 칸 — 컴포넌트.칸 꼴'),
    HP칸: z.string().describe('임프의 현재 HP 를 담은 칸 — 컴포넌트.칸 꼴'),
    지켜볼초: z.number().int().describe('임프를 끌고 간 뒤 돌아오기까지 지켜볼 시간(초) — 케이스 한도 120초 안'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn658');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('임프를 스폰 지점에서 25m 넘게 끌고 간다', async () => {
      const 스폰값 = 가까운스폰(await 스폰목록(admin), 'Beginner', 구역자리.Beginner);
      await GM으로초록들판가기(game);
      const 표본 = await 위치표본모으기(game, params.임프주소, params.위치칸, params.지켜볼초 * 1000);
      const 거리들 = 표본.map((자리) => Math.hypot(자리.x - 스폰값.x, 자리.z - 스폰값.z));
      const 끌려감 = await verify('임프가 스폰 지점에서 25m 넘게 끌려갔다', Math.max(...거리들) > 25, true, { blocker: true });
      const 돌아옴 = await verify('임프가 스폰 지점으로 돌아왔다', (거리들[거리들.length - 1] ?? Infinity) <= 1, true);
      const 회복 = await verify('임프의 HP 가 60 이다', Number(await 칸값읽기(game, params.임프주소, params.HP칸)), 60);
      await verify('리쉬 반경 넘게 끌려간 임프는 HP 를 회복하며 스폰 지점으로 돌아간다', 끌려감 && 돌아옴 && 회복, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
