import { defineCase, test, verify } from '@platform/kit';

import {
  결과고정,
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  봇처치,
  새캐릭터,
  순간이동,
  응답몸,
  캐릭터읽기,
  type 아이템,
  type 봇처치응답,
  type 봇정보,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 봇찾기, 악명봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-611',
  name: '장착 장비만 가진 악명 봇을 전리품 고정으로 처치하면 봇의 장착 장비 하나를 얻는다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 장착 장비만 가진 악명 봇이 있다'],
  held: '보류 — 봇 소지품을 정할 길이 없음(어드민 API)',
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇: 봇정보 | undefined;
  let 장비: 아이템[] = [];
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 악명 봇을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa611');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      봇 = await 악명봇하나(admin, 'zqa611', 나);
    });

    await test.step('캐릭터와 악명 봇의 소지품을 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      const 지금 = await 봇찾기(admin, 나!, 봇!.id);
      장비 = 지금?.equipment ?? [];
      await verify('장착 장비만 가진 악명 봇이 있다', 지금 !== undefined && 장비.length > 0 && 지금.itemCount === 장비.length, true, { blocker: true });
    });

    await test.step('봇 전리품을 얻음으로 고정하고 그 악명 봇을 처치한다', async () => {
      await 결과고정(admin, { botLoot: [true] });
      const 응답 = await 봇처치(admin, 나!, 봇!.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<봇처치응답>(응답);
      const 전리품 = 몸.dropped;
      await verify(
        '장착 장비만 가진 악명 봇을 전리품 고정으로 처치하면 봇의 장착 장비 하나를 얻는다',
        전리품 !== null && 장비.some((x) => x.templateId === 전리품.templateId),
        true,
      );
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
