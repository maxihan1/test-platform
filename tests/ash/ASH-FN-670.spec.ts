import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 위치표본모으기, GM으로초록들판가기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-670',
  name: '봇은 사냥터를 배회하며 몬스터를 사냥하고 가끔 마을로 돌아간다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '판정 불가 — 「가끔」의 기준이 없다',
  params: z.object({
    봇주소: z.string().describe('초록 들판 봇 오브젝트 주소'),
    위치칸: z.string().describe('봇의 위치를 담은 칸 — 컴포넌트.칸 꼴'),
    지켜볼초: z.number().int().describe('봇을 지켜볼 시간(초) — 케이스 한도 120초 안'),
    마을방문횟수: z.number().int().describe('지켜보는 동안 봇이 마을에 들러야 하는 최소 횟수 — 「가끔」의 기준'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn670');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('초록 들판 봇을 지켜본다', async () => {
      await GM으로초록들판가기(game);
      const 표본 = await 위치표본모으기(game, params.봇주소, params.위치칸, params.지켜볼초 * 1000);
      const 마을안 = 표본.map((자리) => 자리.x >= 150 && 자리.x <= 250 && 자리.z >= 0 && 자리.z <= 80);
      const 들른횟수 = 마을안.filter((안, 순번) => 안 && !(마을안[순번 - 1] ?? false)).length;
      const 움직임 = new Set(표본.map((자리) => `${String(자리.x)},${String(자리.z)}`)).size;
      const 배회 = await verify('봇이 사냥터에서 움직인다', 움직임 > 1 && 마을안.some((안) => !안), true);
      const 귀환 = await verify('봇이 마을로 돌아간 횟수가 기준 이상이다', 들른횟수 >= params.마을방문횟수, true);
      await verify('봇은 사냥터를 배회하며 몬스터를 사냥하고 가끔 마을로 돌아간다', 배회 && 귀환, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
