import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점목록, 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-151',
  name: '악명 캐릭터가 빨간 물약을 사면 골드가 30 의 1.2배인 36 줄어든다',
  platforms: ['android'],
  precondition: ['성향치가 −1 인 악명 새 캐릭터가 골드를 넉넉히 가지고 있다'],
  elements: ['item:potion_hp_s', 'state:성향=악명', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('성향치가 −1 인 악명 새 캐릭터를 만들고 골드를 넉넉히 준다', async () => {
      나 = await 새캐릭터(admin, 'zqa151');
      await 바꾸기(admin, 나, { alignment: -1, gold: 10000 });
    });

    await test.step('성향치와 골드를 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('성향치가 −1 이다', 지금.alignment.value, -1, { blocker: true });
      await verify('골드가 10000 이다', 지금.gold, 10000, { blocker: true });
    });

    await test.step('상점 목록을 읽고 빨간 물약 1개를 산다', async () => {
      const 목록 = await verify('상점 목록 응답 코드가 200 이다', (await 상점목록(admin, 나!)).status(), 200);
      const 앞 = (await 가방(admin, 나!)).gold;
      const 구매 = await verify('구매 응답 코드가 200 이다', (await 상점사기(admin, 나!, 'potion_hp_s', 1)).status(), 200);
      const 줄어듦 = await verify('골드가 36 줄어든다', 앞 - (await 가방(admin, 나!)).gold, 36);
      await verify('악명 캐릭터가 빨간 물약을 사면 골드가 30 의 1.2배인 36 줄어든다', 목록 && 구매 && 줄어듦, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
