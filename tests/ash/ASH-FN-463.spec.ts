import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  강화하기,
  계정지우기,
  바꾸기,
  새아이템주기,
  새캐릭터,
  순간이동,
  스폰하나,
  초기화,
  캐릭터읽기,
  몬스터처치,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { GM골드, 구매, 어드민원장, 판매 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-463',
  name: '여러 골드 변동 뒤 원장의 사유가 CHARACTER_CREATED · MONSTER_KILL · SHOP_BUY · SHOP_SELL · ENHANCE · GM_GRANT · ADMIN_ADJUST · ADMIN_RESET 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['flow:골드-GM', 'flow:골드-강화', 'flow:골드-몬스터처치', 'flow:골드-상점구매', 'flow:골드-상점판매', 'flow:골드-어드민', 'item:potion_hp_s', 'item:scroll_weapon', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa463');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('처치 · 구매 · 판매 · 강화 · GM 골드 · 어드민 골드 변경 · 초기화를 하고 원장을 부른다', async () => {
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      await 순간이동(admin, 나!, { x: 스폰.x, z: 스폰.z });
      const 처치 = await verify('몬스터 처치 응답이 200 이다', (await 몬스터처치(admin, 나!, 스폰)).status(), 200);
      const 구매함 = await verify('구매 응답이 200 이다', (await 구매(admin, 나!, 'potion_hp_s', 1)).status(), 200);
      const 물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      const 판매함 = await verify('판매 응답이 200 이다', (await 판매(admin, 나!, 물약?.id ?? 0, 1)).status(), 200);
      const 검 = await 새아이템주기(admin, 나!, 'sword_short');
      const 주문서 = await 새아이템주기(admin, 나!, 'scroll_weapon');
      const 강화함 = await verify('강화 응답이 200 이다', (await 강화하기(admin, 나!, 검.id, 주문서.id)).status(), 200);
      const GM함 = await verify('GM 골드 응답이 200 이다', (await GM골드(admin, 나!, 100)).status(), 200);
      await 바꾸기(admin, 나!, { gold: (await 캐릭터읽기(admin, 나!)).gold + 100 });
      await 초기화(admin, 나!);
      const 사유 = [...new Set((await 어드민원장(admin, 나!)).map((x) => x.reason))].sort().join(', ');
      const 기대 = ['CHARACTER_CREATED', 'MONSTER_KILL', 'SHOP_BUY', 'SHOP_SELL', 'ENHANCE', 'GM_GRANT', 'ADMIN_ADJUST', 'ADMIN_RESET'].sort().join(', ');
      const 맞음 = await verify('원장의 사유가 여덟 가지와 같다', 사유, 기대);
      await verify(
        '여러 골드 변동 뒤 원장의 사유가 CHARACTER_CREATED · MONSTER_KILL · SHOP_BUY · SHOP_SELL · ENHANCE · GM_GRANT · ADMIN_ADJUST · ADMIN_RESET 이다',
        처치 && 구매함 && 판매함 && 강화함 && GM함 && 맞음,
        true,
      );
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
