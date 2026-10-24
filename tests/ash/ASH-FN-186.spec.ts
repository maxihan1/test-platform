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
  장착,
  캐릭터읽기,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 개수, 장비모두해제 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-186',
  name: '장착한 +3 롱 소드가 파괴되면 무기 칸이 비고 공격력이 장비 없는 값으로 돌아간다',
  platforms: ['android'],
  precondition: ['+3 롱 소드를 장착하고 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  let 기준공격력 = 0;
  try {
    await test.step('+3 롱 소드를 장착하고 무기 강화 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa186');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 10000 });
      await 장비모두해제(admin, 나);
      기준공격력 = (await 캐릭터읽기(admin, 나)).stats.attack;
      검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      await 장착(admin, 나, 검);
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('+3 롱 소드를 장착했고 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 그검 = 지금.items.find((x) => x.id === 검);
      await verify('가방에 장착한 +3 롱 소드가 있다', 그검?.enhanceLevel === 3 && 그검.equippedSlot !== null, true, { blocker: true });
      await verify('무기 강화 주문서가 5장이다', 개수(지금, 'scroll_weapon'), 5, { blocker: true });
      await verify('장착한 롱 소드로 공격력이 장비 없는 값보다 크다', (await 캐릭터읽기(admin, 나!)).stats.attack > 기준공격력, true, { blocker: true });
    });

    await test.step('강화 결과를 파괴로 고정하고 장착한 롱 소드를 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Destroy'] });
      const 코드 = await verify('파괴 고정 강화 응답 코드가 200 이다', (await 강화하기(admin, 나!, 검, 주문서)).status(), 200);
      const 뒤 = await 가방(admin, 나!);
      const 칸 = await verify('장착한 아이템이 없다', 뒤.items.filter((x) => x.equippedSlot !== null).length, 0);
      const 공격력 = await verify('공격력이 장비 없는 값이다', (await 캐릭터읽기(admin, 나!)).stats.attack, 기준공격력);
      await verify('장착한 +3 롱 소드가 파괴되면 무기 칸이 비고 공격력이 장비 없는 값으로 돌아간다', 코드 && 칸 && 공격력, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
