import { defineCase, test, verify } from '@platform/kit';

import {
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  드랍확률바꾸기,
  봇처치,
  산봇들,
  새캐릭터,
  순간이동,
  응답몸,
  type 봇정보,
  type 봇처치응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 악명봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-278',
  name: '악명 봇 전리품 확률을 100% 로 바꾸고 악명 봇을 처치하면 전리품을 얻는다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 악명 봇이 있다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 첫째: 봇정보 | undefined;
  let 둘째: 봇정보 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 악명 봇 둘을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa278');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      첫째 = await 악명봇하나(admin, 'zqa278', 나);
      둘째 = await 악명봇하나(admin, 'zqa278', 나, [첫째.id]);
    });

    await test.step('초록 들판에 살아 있는 악명 봇이 있는지 확인한다', async () => {
      const 악명들 = await 산봇들(admin, 나!, 'Beginner', 'Chaotic');
      const 쓸수 = 악명들.filter((b) => b.id === 첫째!.id || b.id === 둘째!.id).length;
      await verify('초록 들판에 살아 있는 악명 봇이 있다', 쓸수, 2, { blocker: true });
    });

    await test.step('악명 봇 전리품 확률을 100% 로 바꾸고 악명 봇을 처치한다', async () => {
      await 드랍확률바꾸기(admin, { botLootChanceChaotic: 1 });
      const 응답 = await 봇처치(admin, 나!, 첫째!.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      await verify('악명 봇 전리품 확률을 100% 로 바꾸고 악명 봇을 처치하면 전리품을 얻는다', 몸.dropped !== null, true);
    });

    await test.step('악명 봇 전리품 확률을 0% 로 바꾸고 악명 봇을 처치한다', async () => {
      await 드랍확률바꾸기(admin, { botLootChanceChaotic: 0 });
      const 응답 = await 봇처치(admin, 나!, 둘째!.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      await verify('악명 봇 전리품 확률을 0% 로 바꾸고 악명 봇을 처치하면 전리품을 얻지 않는다', 몸.dropped, null);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
