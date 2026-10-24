import { defineCase, test, verify } from '@platform/kit';

import {
  결과고정,
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
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
  tcId: 'ASH-FN-279',
  name: '봇 전리품을 안 얻음으로 고정하고 악명 봇을 처치하면 dropped 가 비어 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 악명 봇이 있다'],
  techniques: ['결정 테이블'],
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇: 봇정보 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 악명 봇을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa279');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      봇 = await 악명봇하나(admin, 'zqa279', 나);
    });

    await test.step('초록 들판에 살아 있는 악명 봇이 있는지 확인한다', async () => {
      const 악명들 = await 산봇들(admin, 나!, 'Beginner', 'Chaotic');
      await verify('초록 들판에 살아 있는 악명 봇이 있다', 악명들.some((b) => b.id === 봇!.id), true, { blocker: true });
    });

    await test.step('봇 전리품을 안 얻음으로 고정하고 악명 봇을 처치한다', async () => {
      await 결과고정(admin, { botLoot: [false] });
      const 응답 = await 봇처치(admin, 나!, 봇!.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      await verify('봇 전리품을 안 얻음으로 고정하고 악명 봇을 처치하면 dropped 가 비어 있다', 몸.dropped, null);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
