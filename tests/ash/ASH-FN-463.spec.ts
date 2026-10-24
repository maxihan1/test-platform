import { defineCase, test, verify } from '@platform/kit';

import { 강화하기, 목록글, 몬스터처치, 물약사고팔기, 새캐릭터자리, 아이템번호 } from './helpers/admin.helper.js';
import { 머리, 본문, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 가방읽기, 골드주기, 아이템주기, 원장읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-463',
  name: '캐릭터 생성 · 처치 · 구매 · 판매 · 강화 · GM 지급 · 어드민 조정 · 초기화를 하면 원장 사유가 목록의 이름으로 남는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'flow:골드-상점구매', 'flow:골드-상점판매', 'flow:골드-강화', 'flow:골드-GM', 'flow:골드-어드민', 'flow:골드-몬스터처치'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn463');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('골드가 바뀌는 일을 하나씩 하고 원장 사유를 읽는다', async () => {
      const 나 = 누구!;
      await 물약사고팔기(request, 나);
      await 본문<캐릭터정보>(await request.post('/gm/gold', { headers: 머리(나), data: { amount: 100 } }), 'GM 골드');
      await 골드주기(admin, 나, 1000);
      await 아이템주기(admin, 나, 'scroll_weapon');
      const 가방값 = await 가방읽기(admin, 나);
      await 강화하기(request, 나, 아이템번호(가방값, 'sword_short'), 아이템번호(가방값, 'scroll_weapon'));
      await 몬스터처치(request, admin, 나);
      await 본문(await admin.post(`/admin/characters/${String(나.번호)}/reset`), '캐릭터 초기화');
      const 사유 = new Set((await 원장읽기(admin, 나, 100)).map((줄) => 줄.reason));
      await verify(
        '캐릭터 생성 · 처치 · 구매 · 판매 · 강화 · GM 지급 · 어드민 조정 · 초기화를 하면 원장 사유가 목록의 이름으로 남는다',
        목록글(...사유),
        목록글('CHARACTER_CREATED', 'MONSTER_KILL', 'SHOP_BUY', 'SHOP_SELL', 'ENHANCE', 'GM_GRANT', 'ADMIN_ADJUST', 'ADMIN_RESET'),
      );
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
