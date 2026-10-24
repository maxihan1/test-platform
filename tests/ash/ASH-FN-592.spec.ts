import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 구매, 어드민원장, 판매 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-592',
  name: '여러 골드 변동 뒤 원장 delta 합계가 현재 골드와 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['flow:골드-상점구매', 'flow:골드-상점판매', 'flow:골드-어드민', 'item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa592');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('구매 · 판매 · 어드민 골드 변경을 하고 원장을 모두 더한다', async () => {
      const 구매함 = await verify('구매 응답이 200 이다', (await 구매(admin, 나!, 'potion_hp_s', 1)).status(), 200);
      const 물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      const 판매함 = await verify('판매 응답이 200 이다', (await 판매(admin, 나!, 물약?.id ?? 0, 1)).status(), 200);
      await 바꾸기(admin, 나!, { gold: 800 });
      const 합계 = (await 어드민원장(admin, 나!)).reduce((쌓음, 줄) => 쌓음 + Number(줄.delta), 0);
      const 현재 = (await 캐릭터읽기(admin, 나!)).gold;
      const 같음 = await verify('원장 delta 합계가 현재 골드와 같다', 합계, 현재);
      await verify('여러 골드 변동 뒤 원장 delta 합계가 현재 골드와 같다', 구매함 && 판매함 && 같음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
