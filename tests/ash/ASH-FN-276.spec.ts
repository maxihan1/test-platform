import { defineCase, test, verify } from '@platform/kit';

import { 개수, type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 아이템지우기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇들을처치한결과, 새로시드한선량봇들 } from './helpers/loot.helper.js';
import { 가방서명 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-276',
  name: '봇 전리품이 안 나오도록 고정하고 처치하면 dropped 가 비고 가방이 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 봇 전리품이 나오지 않도록 고정돼 있다', '새 전사 캐릭터가 초록 들판에 있고 봇 전리품이 나오도록 고정돼 있다'],
  techniques: ['결정 테이블'],
  elements: ['zone:Beginner', 'drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 봇들: 봇[] = [];
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      const 본인 = await 새캐릭터(admin, 'qafn276');
      누구 = 본인;
      await 순간이동(admin, 본인, 'Beginner');
      for (const 겹칠것 of (await 가방읽기(admin, 본인)).items.filter((i) => i.equippedSlot === null)) await 아이템지우기(admin, 본인, 겹칠것.id);
      봇들 = await 새로시드한선량봇들(admin, 본인, 2);
      await 결과고정(admin, { botLoot: [false, true] });
    });
    await test.step('캐릭터가 초록 들판에 있고 봇 전리품이 차례로 안 나오고 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      const 고정 = (await 설정읽기(admin)).forced.botLoot;
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('첫 봇 전리품이 안 나오도록 고정돼 있다', 고정[0], false, { blocker: true });
      await verify('다음 봇 전리품이 나오도록 고정돼 있다', 고정[1], true, { blocker: true });
    });
    await test.step('선량한 봇 처치를 보고한다', async () => {
      const 앞 = await 가방읽기(admin, 누구!);
      const 처치 = (await 봇들을처치한결과(request, 누구!, [봇들[0]!]))[0]!;
      const 뒤 = await 가방읽기(admin, 누구!);
      const 비었다 = await verify('dropped 가 비어 있다', 처치.dropped ?? null, null);
      const 그대로다 = await verify('가방이 그대로다', 가방서명(뒤), 가방서명(앞));
      await verify('봇 전리품이 안 나오도록 고정하고 처치하면 dropped 가 비고 가방이 그대로다', 비었다 && 그대로다, true);
      const 앞2 = await 가방읽기(admin, 누구!);
      const 처치2 = (await 봇들을처치한결과(request, 누구!, [봇들[1]!]))[0]!;
      const 뒤2 = await 가방읽기(admin, 누구!);
      const 템플릿 = 처치2.dropped?.templateId ?? '';
      const 나왔다 = await verify('dropped 가 있다', (처치2.dropped ?? null) !== null, true);
      const 늘었다 = await verify('그 아이템이 내 가방에 늘었다', 개수(뒤2, 템플릿) - 개수(앞2, 템플릿), 처치2.dropped?.quantity ?? 0);
      const 줄었다 = await verify('봇의 아이템 수가 1 준다', 봇들[1]!.itemCount - 처치2.bot.itemCount, 1);
      await verify('봇 전리품이 나오도록 고정하고 처치하면 그 아이템이 봇에서 내 가방으로 옮겨진다', 나왔다 && 늘었다 && 줄었다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
