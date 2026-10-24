import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 값모으기, GM으로초록들판가기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-669',
  name: '선공형 봇은 12m 안의 선량한 플레이어를 먼저 공격한다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 봇 행동을 읽을 게임 속성 주소를 모름',
  params: z.object({
    봇주소: z.string().describe('선공형 봇 오브젝트 주소'),
    행동칸: z.string().describe('봇의 지금 행동을 담은 칸 — 컴포넌트.칸 꼴'),
    공격상태: z.string().describe('봇이 플레이어를 공격할 때의 행동 값'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn669');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('선공형 봇에게서 12m 안으로 다가간다', async () => {
      await GM으로초록들판가기(game);
      const 지켜본동안 = await 값모으기(game, params.봇주소, params.행동칸, 15_000);
      await verify('선공형 봇은 12m 안의 선량한 플레이어를 먼저 공격한다', 지켜본동안.includes(JSON.stringify(params.공격상태)), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
