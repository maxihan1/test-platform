import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  결과고정,
  계정지우기,
  고정비우기,
  구역자리,
  사망보고,
  새캐릭터,
  순간이동,
  아이템주기,
  응답몸,
  장비빼고비우기,
  캐릭터읽기,
  type 사망응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-262',
  name: '드랍 고정으로 사망하면 빨간 물약 10개 한 묶음이 사망 자리 바닥에 떨어진다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개 한 묶음만 장착 장비 밖에 가진 새 캐릭터가 초록 들판에 있다'],
  elements: ['item:potion_hp_s', 'zone:Beginner', 'drop:death_0이상'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 10개 한 묶음만 장착 장비 밖에 가진 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa262');
      await 고정비우기(admin);
      await 장비빼고비우기(admin, 나);
      await 아이템주기(admin, 나, 'potion_hp_s', { 수량: 10 });
      await 순간이동(admin, 나, 'Beginner');
    });

    await test.step('장착 장비 밖 아이템과 캐릭터 자리를 확인한다', async () => {
      const 밖 = (await 가방(admin, 나!)).items
        .filter((x) => x.equippedSlot === null)
        .map((x) => `${x.templateId} ${String(x.quantity)}개`)
        .join(', ');
      await verify('장착 장비 밖에는 빨간 물약 10개 한 묶음만 있다', 밖, 'potion_hp_s 10개', { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('사망 드랍을 떨어짐으로 고정하고 사망을 보고한다', async () => {
      await 결과고정(admin, { deathDrop: [true] });
      const 응답 = await 사망보고(admin, 나!, { killerType: 'Monster', killerId: '1' }, 구역자리.Beginner);
      await verify('사망 보고 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<사망응답>(응답);
      const 이름 = await verify('떨어진 아이템이 빨간 물약이다', 몸.dropped?.templateId, 'potion_hp_s');
      const 수 = await verify('떨어진 빨간 물약이 10개다', 몸.dropped?.quantity, 10);
      const 자리 = await verify(
        '떨어진 자리가 사망 자리다',
        `${String(몸.dropped?.x)},${String(몸.dropped?.z)}`,
        `${String(구역자리.Beginner.x)},${String(구역자리.Beginner.z)}`,
      );
      await verify('드랍 고정으로 사망하면 빨간 물약 10개 한 묶음이 사망 자리 바닥에 떨어진다', 이름 && 수 && 자리, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
