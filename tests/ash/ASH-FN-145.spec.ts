import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 머리, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 가방채우기, 결과고정, 결과고정비우기, 구역자리, 봇목록, 새캐릭터, 설정읽기, 순간이동, 아이템지우기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-145',
  name: '가방이 꽉 찬 캐릭터가 봇을 처치하면 전리품이 바닥에 떨어지고 droppedToGround 가 true 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터의 가방이 40칸 꽉 차 있고 봇 전리품이 나오도록 고정돼 있다'],
  elements: ['zone:Beginner', 'drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('가방이 꽉 찬 새 전사 캐릭터를 초록 들판에 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn145');
      await 순간이동(admin, 누구, 'Beginner');
      for (const 겹칠것 of (await 가방읽기(admin, 누구)).items.filter((i) => i.equippedSlot === null && i.templateId !== 'helm_leather')) {
        await 아이템지우기(admin, 누구, 겹칠것.id);
      }
      await 가방채우기(admin, 누구, 0);
    });
    await test.step('봇 전리품이 나오도록 고정한다', async () => {
      await 결과고정비우기(admin);
      await 결과고정(admin, { botLoot: [true] });
    });
    await test.step('가방이 40칸 꽉 차 있고 봇 전리품이 나오도록 고정돼 있는지 확인한다', async () => {
      await verify('가방 사용 칸이 40 이다', (await 가방받기(request, 누구!)).used, 40, { blocker: true });
      await verify('봇 전리품이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.botLoot, [true], { blocker: true });
    });
    await test.step('초록 들판 봇 처치를 보고한다', async () => {
      const 봇 = (await 봇목록(admin, 누구!, 'Beginner')).find((b) => !b.isDead && b.itemCount > 0);
      if (봇 === undefined) throw new Error('초록 들판에 아이템을 가진 살아 있는 봇이 없다');
      const 처치 = await 본문<{ droppedToGround: boolean; groundItemId: number | null }>(
        await request.post('/combat/bot-kill', { headers: 머리(누구!), data: { botId: 봇.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z } }),
        '봇 처치 보고',
      );
      const 바닥번호받음 = await verify('전리품이 바닥 아이템 번호를 받았다', 처치.groundItemId !== null, true);
      const 표시 = await verify('처치 응답의 droppedToGround 가 true 다', 처치.droppedToGround, true);
      await verify('가방이 꽉 찬 캐릭터가 봇을 처치하면 전리품이 바닥에 떨어지고 droppedToGround 가 true 다', 바닥번호받음 && 표시, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
