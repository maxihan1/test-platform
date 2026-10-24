import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  강화하기,
  계정지우기,
  결과고정,
  고정비우기,
  바꾸기,
  새아이템주기,
  새캐릭터,
  응답몸,
  type 강화응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-547',
  name: '실패 · 성공 차례로 고정하고 두 번 강화하면 첫 번째가 「Fail」 두 번째가 「Success」다',
  platforms: ['android'],
  precondition: ['+3 롱 소드 둘과 주문서를 가진 새 캐릭터가 있다'],
  elements: ['item:scroll_weapon', 'item:sword_long', 'rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 첫검 = 0;
  let 둘째검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+3 롱 소드 둘과 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa547');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 5000 });
      첫검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      둘째검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +3 롱 소드 둘과 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 첫째 +3 롱 소드가 있다', 지금.items.find((x) => x.id === 첫검)?.enhanceLevel, 3, { blocker: true });
      await verify('가방에 둘째 +3 롱 소드가 있다', 지금.items.find((x) => x.id === 둘째검)?.enhanceLevel, 3, { blocker: true });
      await verify('가방에 주문서가 있다', 지금.items.find((x) => x.id === 주문서)?.quantity, 5, { blocker: true });
    });

    await test.step('강화 결과를 실패 · 성공 차례로 고정하고 두 번 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Fail', 'Success'] });
      const 첫응답 = await 강화하기(admin, 나!, 첫검, 주문서);
      const 첫코드 = await verify('첫 번째 강화 응답이 200 이다', 첫응답.status(), 200);
      const 첫결과 = await verify('첫 번째가 「Fail」이다', (await 응답몸<강화응답>(첫응답)).result, 'Fail');
      const 둘째응답 = await 강화하기(admin, 나!, 둘째검, 주문서);
      const 둘째코드 = await verify('두 번째 강화 응답이 200 이다', 둘째응답.status(), 200);
      const 둘째결과 = await verify('두 번째가 「Success」다', (await 응답몸<강화응답>(둘째응답)).result, 'Success');
      await verify('실패 · 성공 차례로 고정하고 두 번 강화하면 첫 번째가 「Fail」 두 번째가 「Success」다', 첫코드 && 첫결과 && 둘째코드 && 둘째결과, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
