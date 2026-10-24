import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 물약만가지기, 상점팔기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-156',
  name: '악명 캐릭터가 빨간 물약 1개를 팔아도 골드가 10 는다',
  platforms: ['android'],
  precondition: ['성향치가 −1 인 악명 새 캐릭터가 빨간 물약을 가지고 있다'],
  techniques: ['상태 전이'],
  elements: ['item:potion_hp_s', 'state:성향=악명', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('성향치가 −1 인 악명 새 캐릭터를 만들고 빨간 물약을 준다', async () => {
      나 = await 새캐릭터(admin, 'zqa156');
      await 바꾸기(admin, 나, { alignment: -1 });
      await 물약만가지기(admin, 나, 10);
    });

    await test.step('악명 캐릭터가 빨간 물약을 가졌는지 확인한다', async () => {
      await verify('성향치가 −1 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, -1, { blocker: true });
      await verify('빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
    });

    await test.step('빨간 물약 1개를 판다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 물약 = 지금.items.find((x) => x.templateId === 'potion_hp_s');
      const 판매 = await verify('판매 응답 코드가 200 이다', (await 상점팔기(admin, 나!, 물약?.id ?? 0, 1)).status(), 200);
      const 늘어남 = await verify('골드가 10 늘어난다', (await 가방(admin, 나!)).gold - 지금.gold, 10);
      await verify('악명 캐릭터가 빨간 물약 1개를 팔아도 골드가 10 는다', 판매 && 늘어남, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
