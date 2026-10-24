import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  결과고정,
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  봇처치,
  새캐릭터,
  순간이동,
  응답몸,
  캐릭터읽기,
  type 봇처치응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-276',
  name: '봇 전리품을 얻음으로 고정하고 처치하면 전리품이 처치자 가방에 들어온다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  techniques: ['결정 테이블'],
  elements: ['zone:Beginner', 'drop:bot_loot', 'state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 봇 전리품 확률을 기본 설정으로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa276');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('봇 전리품을 얻음으로 고정하고 선량한 봇을 처치한다', async () => {
      const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
      await 결과고정(admin, { botLoot: [true] });
      const 응답 = await 봇처치(admin, 나!, 봇.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      const 전리품 = 몸.dropped;
      const 가방에 = 전리품 !== null && (await 가방(admin, 나!)).items.some((x) => x.id === 전리품.id);
      await verify('봇 전리품을 얻음으로 고정하고 처치하면 전리품이 처치자 가방에 들어온다', 가방에, true);
    });

    await test.step('봇 전리품을 안 얻음으로 고정하고 선량한 봇을 처치한다', async () => {
      const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
      await 결과고정(admin, { botLoot: [false] });
      const 응답 = await 봇처치(admin, 나!, 봇.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      await verify('봇 전리품을 안 얻음으로 고정하고 처치하면 dropped 가 비어 있다', 몸.dropped, null);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
