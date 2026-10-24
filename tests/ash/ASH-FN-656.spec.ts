import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 값이바뀔때까지, 칸값읽기, GM으로초록들판가기 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-656',
  name: '몬스터를 여러 번 공격해도 데미지가 0.9~1.1 배 범위를 벗어나지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 데미지 값을 읽을 게임 속성 주소를 모름',
  techniques: ['결정 테이블'],
  elements: ['class:Warrior', 'monster:Imp'],
  params: z.object({
    몬스터주소: z.string().describe('몬스터가 입은 데미지를 읽을 게임 오브젝트 주소'),
    데미지칸: z.string().describe('입은 데미지를 담은 칸 — 컴포넌트.칸 꼴'),
    공격횟수: z.number().int().describe('공격할 횟수 — 5 이상').default(20),
  }),
  expected: null,
});

test(spec, async ({ game, admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn656');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('몬스터를 여러 번 공격한다', async () => {
      const 공격력 = (await 캐릭터정보받기(request, 누구!)).stats.attack;
      await GM으로초록들판가기(game);
      const 월드 = new 월드화면(game);
      const 기본 = Math.max(1, 공격력 - 2 / 2);
      const 벗어난: number[] = [];
      let 이전 = await 칸값읽기(game, params.몬스터주소, params.데미지칸);
      for (let 번 = 0; 번 < params.공격횟수; 번 += 1) {
        await 월드.누르기('AttackButton');
        이전 = await 값이바뀔때까지(game, params.몬스터주소, params.데미지칸, 이전);
        const 데미지 = Number(이전);
        if (데미지 < 기본 * 0.9 || 데미지 > 기본 * 1.1) 벗어난.push(데미지);
      }
      await verify('몬스터를 여러 번 공격해도 데미지가 0.9~1.1 배 범위를 벗어나지 않는다', 벗어난.length, 0);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
