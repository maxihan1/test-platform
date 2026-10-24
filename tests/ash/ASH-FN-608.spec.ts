import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점팔기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-608',
  name: '팔 수 없는 아이템을 팔려 하면 409 「NOT_SELLABLE」이다',
  platforms: ['android'],
  held: '보류 — 어떤 아이템이 팔 수 없는지 자료에 없음',
  precondition: ['팔 수 없는 아이템을 가진 새 캐릭터가 있다'],
  elements: ['flow:골드-상점판매'],
  params: z.object({
    팔수없는아이템: z.string().describe('팔 수 없는 아이템의 템플릿 번호 — 상점에서 팔 수 없는 아이템'),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 아이템번호 = 0;
  try {
    await test.step('팔 수 없는 아이템을 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa608');
      아이템번호 = (await 새아이템주기(admin, 나, params.팔수없는아이템)).id;
    });

    await test.step('팔 수 없는 아이템이 가방에 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('팔 수 없는 아이템이 가방에 있다', 지금.items.some((x) => x.id === 아이템번호), true, { blocker: true });
    });

    await test.step('그 아이템을 판다', async () => {
      const 응답 = await 상점팔기(admin, 나!, 아이템번호, 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「NOT_SELLABLE」이다', await 오류코드(응답), 'NOT_SELLABLE');
      await verify('팔 수 없는 아이템을 팔려 하면 409 「NOT_SELLABLE」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
