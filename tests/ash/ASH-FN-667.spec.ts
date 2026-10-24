import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 값모으기, GM으로초록들판가기 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-667',
  name: '평화형 봇은 선량한 플레이어를 무시하고 공격받으면 도망간다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 봇 행동을 읽을 게임 속성 주소를 모름',
  params: z.object({
    봇주소: z.string().describe('평화형 봇 오브젝트 주소'),
    행동칸: z.string().describe('봇의 지금 행동을 담은 칸 — 컴포넌트.칸 꼴'),
    무시상태: z.string().describe('봇이 플레이어를 무시할 때의 행동 값'),
    도망상태: z.string().describe('봇이 도망갈 때의 행동 값'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn667');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('평화형 봇 곁에서 기다리고 공격한다', async () => {
      await GM으로초록들판가기(game);
      const 기다린동안 = await 값모으기(game, params.봇주소, params.행동칸, 10_000);
      await new 월드화면(game).누르기('AttackButton');
      const 맞은뒤 = await 값모으기(game, params.봇주소, params.행동칸, 10_000);
      const 무시 = await verify('평화형 봇이 선량한 플레이어를 무시한다', 기다린동안.every((값) => 값 === JSON.stringify(params.무시상태)), true);
      const 도망 = await verify('평화형 봇이 공격받으면 도망간다', 맞은뒤.includes(JSON.stringify(params.도망상태)), true);
      await verify('평화형 봇은 선량한 플레이어를 무시하고 공격받으면 도망간다', 무시 && 도망, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
