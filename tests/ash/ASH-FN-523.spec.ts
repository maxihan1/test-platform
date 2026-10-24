import { defineCase, test, verify } from '@platform/kit';

import { 강화기록읽기, 강화하기, 새캐릭터자리, 아이템번호 } from './helpers/admin.helper.js';
import { 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-523',
  name: '강화하면 어드민 강화 기록에 그 강화가 templateId · fromLevel · toLevel · result 로 남는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 롱 소드와 무기 강화 주문서를 가지고 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn523');
    });
    await test.step('새 전사 캐릭터에게 롱 소드와 무기 강화 주문서를 준다', async () => {
      await 아이템주기(admin, 누구!, 'sword_long');
      await 아이템주기(admin, 누구!, 'scroll_weapon');
    });
    await test.step('새 전사 캐릭터가 가진 롱 소드와 주문서를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('새 전사 캐릭터가 롱 소드와 무기 강화 주문서를 가지고 있다', 찾기(가방값, 'sword_long') !== undefined && 찾기(가방값, 'scroll_weapon') !== undefined, true, {
        blocker: true,
      });
    });
    await test.step('롱 소드를 강화하고 어드민으로 강화 기록을 받는다', async () => {
      const 나 = 누구!;
      const 가방값 = await 가방읽기(admin, 나);
      const 롱소드 = 아이템번호(가방값, 'sword_long');
      const 강화 = await 강화하기(request, 나, 롱소드, 아이템번호(가방값, 'scroll_weapon'));
      const 기록 = (await 강화기록읽기(admin, 나)).find((줄) => 줄.itemId === 롱소드);
      const 이름 = await verify('강화 기록의 templateId 가 sword_long 이다', 기록?.templateId, 'sword_long');
      const 전 = await verify('강화 기록의 fromLevel 이 강화 전 수치와 같다', 기록?.fromLevel, 강화.fromLevel);
      const 후 = await verify('강화 기록의 toLevel 이 강화 뒤 수치와 같다', 기록?.toLevel, 강화.toLevel);
      const 결과 = await verify('강화 기록의 result 가 강화 결과와 같다', 기록?.result, 강화.result);
      await verify('강화하면 어드민 강화 기록에 그 강화가 templateId · fromLevel · toLevel · result 로 남는다', 이름 && 전 && 후 && 결과, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
