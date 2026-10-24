import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 빨간봇처치들, 장비전리품수 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-280',
  name: '빨간 이름 봇을 20번 처치하면 전리품에 봇이 장착하던 장비가 나온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 봇 전리품이 나오도록 고정돼 있다'],
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: z.object({
    횟수: z.number().int().describe('처치할 횟수 — 1 이상').default(20),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      const 본인 = await 새캐릭터(admin, 'qafn280');
      누구 = 본인;
      await 순간이동(admin, 본인, 'Beginner');
      await 결과고정(admin, { botLoot: Array.from({ length: params.횟수 }, () => true) });
    });
    await test.step('캐릭터가 초록 들판에 있고 봇 전리품이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('봇 전리품이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.botLoot[0], true, { blocker: true });
    });
    await test.step('빨간 이름 봇 처치를 20번 보고한다', async () => {
      const { 봇들, 결과들 } = await 빨간봇처치들(request, admin, [누구!], params.횟수);
      await verify('빨간 이름 봇을 20번 처치하면 전리품에 봇이 장착하던 장비가 나온다', 장비전리품수(봇들, 결과들) > 0, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
