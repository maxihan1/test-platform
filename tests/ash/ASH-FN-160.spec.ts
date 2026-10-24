import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점목록 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-160',
  name: '선량한 캐릭터가 상점 목록을 부르면 priceMultiplier 가 1 이고 items 마다 templateId 와 price 가 있다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 있다'],
  elements: ['state:성향=선량', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

interface 상점응답 {
  priceMultiplier: number;
  items: { templateId?: unknown; price?: unknown }[];
}

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('선량한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa160');
    });

    await test.step('캐릭터가 선량한지 확인한다', async () => {
      await verify('캐릭터 성향 상태가 「Innocent」다', (await 캐릭터읽기(admin, 나!)).alignment.state, 'Innocent', { blocker: true });
    });

    await test.step('상점 목록을 부른다', async () => {
      const 응답 = await 상점목록(admin, 나!);
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<상점응답>(응답);
      const 배수 = await verify('priceMultiplier 가 1 이다', 몸.priceMultiplier, 1);
      const 있음 = await verify('items 가 비어 있지 않다', 몸.items.length > 0, true);
      const 빠진 = 몸.items.flatMap((x, i) => (typeof x.templateId === 'string' && typeof x.price === 'number' ? [] : [String(i)])).join(', ');
      const 칸 = await verify('templateId 나 price 가 없는 items 번호가 없다', 빠진, '');
      await verify('선량한 캐릭터가 상점 목록을 부르면 priceMultiplier 가 1 이고 items 마다 templateId 와 price 가 있다', 코드 && 배수 && 있음 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
