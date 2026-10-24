import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  계정지우기,
  결과고정,
  고정비우기,
  바꾸기,
  사망보고,
  새캐릭터,
  순간이동,
  아이템주기,
  장비빼고비우기,
  type 사망응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-255',
  name: '성향치 −100 인 캐릭터가 장착 장비만 가진 채 드랍 고정으로 사망하면 아무것도 떨어지지 않는다',
  platforms: ['android'],
  precondition: ['성향치 −100 인 새 캐릭터가 장착 장비만 가지고 있다', '성향치 −100 인 새 캐릭터가 빨간 물약을 가지고 있다'],
  techniques: ['결정 테이블', '상태 전이'],
  elements: ['drop:death_-1~-299', 'item:potion_hp_s', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('성향치 −100 이고 장착 장비만 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa255');
      await 고정비우기(admin);
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { alignment: -100 });
      await 장비빼고비우기(admin, 나);
    });

    await test.step('가방에 장착 장비만 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방의 아이템이 모두 장착 중이다', 지금.items.every((x) => x.equippedSlot !== null), true, { blocker: true });
    });

    await test.step('사망 드랍을 떨어짐으로 고정하고 사망을 보고한다', async () => {
      await 결과고정(admin, { deathDrop: [true] });
      const 응답 = await 사망보고(admin, 나!);
      await verify('사망 보고 응답이 200 이다', 응답.status(), 200);
      const 떨군 = ((await 응답.json()) as 사망응답).dropped;
      await verify('성향치 −100 인 캐릭터가 장착 장비만 가진 채 드랍 고정으로 사망하면 아무것도 떨어지지 않는다', 떨군, null);
    });

    await test.step('사망 드랍을 안 떨어짐으로 고정하고 사망을 보고한다', async () => {
      await 고정비우기(admin);
      await 아이템주기(admin, 나!, 'potion_hp_s', { 수량: 10 });
      await 결과고정(admin, { deathDrop: [false] });
      const 응답 = await 사망보고(admin, 나!);
      await verify('안 떨어짐 고정 사망 보고 응답이 200 이다', 응답.status(), 200);
      const 물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      await verify('성향치 −100 인 캐릭터가 안 떨어짐 고정으로 사망하면 빨간 물약이 가방에 그대로 있다', 물약?.quantity, 10);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
