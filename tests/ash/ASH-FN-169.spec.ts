import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 물약만가지기, 상점팔기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-169',
  name: '빨간 물약 10개로 11개를 팔려 하면 409 「NOT_ENOUGH_QUANTITY」다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개를 가진 새 캐릭터가 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점판매'],
  params: z.object({
    수량: z.number().int().min(11).max(5000).describe('팔려는 빨간 물약 수량 — 11 이상 5000 이하 (가진 10개보다 많은 수)').default(11),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 10개를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa169');
      await 물약만가지기(admin, 나, 10);
    });

    await test.step('빨간 물약 10개를 가졌는지 확인한다', async () => {
      await verify('빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
    });

    await test.step('빨간 물약 11개를 판다', async () => {
      const 물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      const 응답 = await 상점팔기(admin, 나!, 물약?.id ?? 0, params.수량);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「NOT_ENOUGH_QUANTITY」다', await 오류코드(응답), 'NOT_ENOUGH_QUANTITY');
      await verify('빨간 물약 10개로 11개를 팔려 하면 409 「NOT_ENOUGH_QUANTITY」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
