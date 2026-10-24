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
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-192',
  name: '강화 결과를 실패로 고정하고 목표 +4 강화를 하면 롱 소드가 +3 그대로 가방에 남는다',
  platforms: ['android'],
  precondition: ['+3 롱 소드와 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  techniques: ['결정 테이블'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+3 롱 소드 · 무기 강화 주문서 · 강화 두 번 할 골드를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa192');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 900 });
      검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +3 롱 소드가 있는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('가방에 +3 롱 소드가 있다', 그검?.enhanceLevel, 3, { blocker: true });
    });

    await test.step('강화 결과를 실패로 고정하고 목표 +4 강화를 한 번 한다', async () => {
      await 결과고정(admin, { enhance: ['Fail'] });
      const 응답 = await 강화하기(admin, 나!, 검, 주문서);
      await verify('강화 응답이 200 이다', 응답.status(), 200);
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('강화 결과를 실패로 고정하고 목표 +4 강화를 하면 롱 소드가 +3 그대로 가방에 남는다', 그검?.enhanceLevel, 3);
    });

    await test.step('강화 결과를 파괴로 고정하고 목표 +4 강화를 한 번 한다', async () => {
      await 결과고정(admin, { enhance: ['Destroy'] });
      const 응답 = await 강화하기(admin, 나!, 검, 주문서);
      await verify('파괴 고정 강화 응답이 200 이다', 응답.status(), 200);
      const 남음 = (await 가방(admin, 나!)).items.some((x) => x.id === 검);
      await verify('강화 결과를 파괴로 고정하고 목표 +4 강화를 하면 롱 소드가 가방에서 사라진다', 남음, false);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
