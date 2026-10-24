import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 봇, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 구역자리, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치, type 봇처치결과, 부활할때까지 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-666',
  name: '아이템이 최소 수량 이상인 봇은 부활해도 보충하지 않는다',
  platforms: ['android'],
  precondition: ['아이템을 잃지 않은 봇이 있다'],
  held: '판정 불가 — 최소 수량이 기획서에 없다',
  techniques: ['상태 전이'],
  elements: ['drop:bot_loot', 'zone:Beginner'],
  params: z.object({
    최소수량: z.number().int().describe('봇이 부활할 때 채워 두는 아이템 최소 수량 — 1 이상'),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  let 고른봇: 봇 | undefined;
  let 처치값: 봇처치결과 | undefined;
  try {
    await 결과고정비우기(admin);
    await test.step('새 전사 캐릭터를 초록 들판으로 보내고 봇을 고른다', async () => {
      누구 = await 새캐릭터(admin, 'qafn666');
      await 순간이동(admin, 누구, 'Beginner');
      고른봇 = await 살아있는봇(admin, 누구, 'Beginner');
    });
    await test.step('봇이 아이템을 잃지 않게 처치한다', async () => {
      await 결과고정(admin, { botLoot: [false] });
      처치값 = await 봇처치(request, 누구!, 고른봇!.id, 구역자리.Beginner);
    });
    await test.step('아이템을 잃지 않은 봇이 있는지 확인한다', async () => {
      const 안잃음 = await verify('봇이 아이템을 잃지 않았다', 처치값!.dropped === null && !처치값!.droppedToGround, true, { blocker: true });
      const 충분함 = await verify('봇의 아이템이 최소 수량 이상이다', 처치값!.bot.itemCount >= params.최소수량, true, { blocker: true });
      await verify('아이템을 잃지 않은 봇이 있다', 안잃음 && 충분함, true, { blocker: true });
    });
    await test.step('봇이 부활할 때까지 기다린 뒤 봇 목록을 받는다', async () => {
      const 지금 = await 부활할때까지(admin, 누구!, 고른봇!.id);
      await verify('아이템이 최소 수량 이상인 봇은 부활해도 보충하지 않는다', 지금.itemCount, 처치값!.bot.itemCount);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
