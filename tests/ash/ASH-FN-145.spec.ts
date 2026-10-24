import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  가방채우기,
  계정지우기,
  결과고정,
  고정목록,
  고정비우기,
  봇처치,
  새캐릭터,
  순간이동,
  응답몸,
  캐릭터읽기,
  type 봇처치응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-145',
  name: '가방이 찬 캐릭터가 봇을 처치하면 응답의 droppedToGround 가 true 이고 바닥 아이템 번호가 있다',
  platforms: ['android'],
  precondition: ['가방 40칸이 찬 새 캐릭터가 초록 들판에 있고 봇 전리품이 떨어짐으로 고정돼 있다'],
  elements: ['zone:Beginner', 'drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('가방 40칸이 찬 새 캐릭터를 초록 들판에 두고 봇 전리품을 떨어짐으로 고정한다', async () => {
      나 = await 새캐릭터(admin, 'zqa145');
      await 고정비우기(admin);
      await 가방채우기(admin, 나);
      await 순간이동(admin, 나, 'Beginner');
      봇번호 = (await 선량한봇하나(admin, 나, 4))?.id ?? 0;
      await 결과고정(admin, { botLoot: [true] });
    });

    await test.step('가방이 찼고 봇 전리품이 고정됐는지 확인한다', async () => {
      await verify('가방 쓴 칸이 40 이다', (await 가방(admin, 나!)).used, 40, { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      await verify('봇 전리품이 떨어짐으로 고정돼 있다', (await 고정목록(admin)).botLoot.join(', '), 'true', { blocker: true });
      await verify('초록 들판에 살아 있는 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('초록 들판 봇을 처치한다', async () => {
      const 응답 = await 봇처치(admin, 나!, 봇번호);
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      const 땅 = await verify('droppedToGround 가 true 다', 몸.droppedToGround, true);
      const 번호 = await verify('바닥 아이템 번호가 있다', typeof 몸.groundItemId === 'number', true);
      await verify('가방이 찬 캐릭터가 봇을 처치하면 응답의 droppedToGround 가 true 이고 바닥 아이템 번호가 있다', 코드 && 땅 && 번호, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
