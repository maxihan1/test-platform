import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 값모으기, GM으로초록들판가기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-657',
  name: '임프는 배회 → 어그로(8m) → 추적 → 공격 → 리쉬 순서로 움직인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 몬스터 AI 상태를 읽을 게임 속성 주소를 모름',
  elements: ['monster:Imp'],
  params: z.object({
    임프주소: z.string().describe('임프 오브젝트 주소'),
    AI상태칸: z.string().describe('임프의 AI 상태를 담은 칸 — 컴포넌트.칸 꼴'),
    기대순서: z.string().describe('AI 상태 값을 배회, 어그로, 추적, 공격, 리쉬 차례로 「, 」로 이은 글 — 게임이 주는 값 그대로, 글자 값은 따옴표 포함'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn657');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('초록 들판에서 임프 곁으로 다가간다', async () => {
      await GM으로초록들판가기(game);
      const 순서 = await 값모으기(game, params.임프주소, params.AI상태칸, 60_000);
      await verify('임프는 배회 → 어그로(8m) → 추적 → 공격 → 리쉬 순서로 움직인다', 순서.join(', '), params.기대순서);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
