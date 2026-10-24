import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 칸값읽기, GM으로초록들판가기 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-655',
  name: '몬스터를 공격하면 데미지가 max(1, 공격력 − 방어력/2) × 0.9~1.1 이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 데미지 값을 읽을 게임 속성 주소를 모름',
  elements: ['class:Warrior', 'monster:Imp'],
  params: z.object({
    몬스터주소: z.string().describe('몬스터가 입은 데미지를 읽을 게임 오브젝트 주소'),
    데미지칸: z.string().describe('입은 데미지를 담은 칸 — 컴포넌트.칸 꼴'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn655');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('몬스터를 공격한다', async () => {
      const 공격력 = (await 캐릭터정보받기(request, 누구!)).stats.attack;
      await GM으로초록들판가기(game);
      await new 월드화면(game).누르기('AttackButton');
      const 데미지 = Number(await 칸값읽기(game, params.몬스터주소, params.데미지칸));
      const 기본 = Math.max(1, 공격력 - 2 / 2);
      const 아래 = await verify('데미지가 기본 데미지의 0.9 배 이상이다', 데미지 >= 기본 * 0.9, true);
      const 위 = await verify('데미지가 기본 데미지의 1.1 배 이하다', 데미지 <= 기본 * 1.1, true);
      await verify('몬스터를 공격하면 데미지가 max(1, 공격력 − 방어력/2) × 0.9~1.1 이다', 아래 && 위, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
