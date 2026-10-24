import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 빨간봇처치들 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-279',
  name: '빨간 이름 봇도 전리품이 안 나오도록 고정하면 dropped 가 빈다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 봇 전리품이 나오지 않도록 고정돼 있다'],
  techniques: ['결정 테이블'],
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      const 본인 = await 새캐릭터(admin, 'qafn279');
      누구 = 본인;
      await 순간이동(admin, 본인, 'Beginner');
      await 결과고정(admin, { botLoot: [false] });
    });
    await test.step('캐릭터가 초록 들판에 있고 봇 전리품이 나오지 않도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('봇 전리품이 안 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.botLoot[0], false, { blocker: true });
    });
    await test.step('빨간 이름 봇 처치를 보고한다', async () => {
      const { 결과들 } = await 빨간봇처치들(request, admin, [누구!], 1);
      await verify('빨간 이름 봇도 전리품이 안 나오도록 고정하면 dropped 가 빈다', 결과들[0]?.dropped ?? null, null);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
