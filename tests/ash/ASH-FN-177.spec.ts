import { defineCase, test, verify } from '@platform/kit';

import { 가방, 강화하기, 계정지우기, 바꾸기, 새아이템주기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-177',
  name: '짧은 검에 방어구 강화 주문서를 쓰면 409 「SCROLL_MISMATCH」다',
  platforms: ['android'],
  precondition: ['짧은 검과 방어구 강화 주문서를 가진 새 캐릭터가 있다', '가죽 갑옷과 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:sword_short', 'item:armor_leather', 'item:scroll_armor', 'item:scroll_weapon'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 갑옷 = 0;
  let 방어구주문서 = 0;
  let 무기주문서 = 0;
  try {
    await test.step('짧은 검 · 가죽 갑옷 · 방어구 강화 주문서 · 무기 강화 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa177');
      await 바꾸기(admin, 나, { gold: 10000 });
      검 = (await 새아이템주기(admin, 나, 'sword_short')).id;
      갑옷 = (await 새아이템주기(admin, 나, 'armor_leather')).id;
      방어구주문서 = (await 새아이템주기(admin, 나, 'scroll_armor', { 수량: 2 })).id;
      무기주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 2 })).id;
    });

    await test.step('가방에 두 아이템과 두 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 있다 = (번호: number): boolean => 지금.items.some((x) => x.id === 번호);
      await verify('짧은 검과 방어구 강화 주문서를 가지고 있다', 있다(검) && 있다(방어구주문서), true, { blocker: true });
      await verify('가죽 갑옷과 무기 강화 주문서를 가지고 있다', 있다(갑옷) && 있다(무기주문서), true, { blocker: true });
    });

    await test.step('짧은 검에 방어구 강화 주문서를 쓴다', async () => {
      const 응답 = await 강화하기(admin, 나!, 검, 방어구주문서);
      const 코드 = await verify('짧은 검에 쓴 응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('짧은 검에 쓴 오류 코드가 「SCROLL_MISMATCH」다', await 오류코드(응답), 'SCROLL_MISMATCH');
      await verify('짧은 검에 방어구 강화 주문서를 쓰면 409 「SCROLL_MISMATCH」다', 코드 && 이름, true);
    });

    await test.step('가죽 갑옷에 무기 강화 주문서를 쓴다', async () => {
      const 응답 = await 강화하기(admin, 나!, 갑옷, 무기주문서);
      const 코드 = await verify('가죽 갑옷에 쓴 응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('가죽 갑옷에 쓴 오류 코드가 「SCROLL_MISMATCH」다', await 오류코드(응답), 'SCROLL_MISMATCH');
      await verify('가죽 갑옷에 무기 강화 주문서를 쓰면 409 「SCROLL_MISMATCH」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
