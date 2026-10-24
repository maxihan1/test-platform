import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방받기, 찾기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 오류코드, 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-661',
  name: '팔 수 없는 아이템을 팔면 409 「NOT_SELLABLE」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  held: '보류 — 팔 수 없는 아이템이 아이템 표에 없음',
  elements: ['flow:골드-상점판매'],
  params: z.object({
    팔수없는아이템: z.string().describe('팔 수 없는 아이템의 templateId'),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn661');
      await 아이템주기(admin, 누구, params.팔수없는아이템);
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
      await verify('가방에 팔 수 없는 아이템이 있다', 찾기(await 가방받기(request, 누구!), params.팔수없는아이템) !== undefined, true, { blocker: true });
    });
    await test.step('팔 수 없는 아이템을 판다', async () => {
      const 응답 = await 판매하기(request, 누구!, 찾기(await 가방받기(request, 누구!), params.팔수없는아이템)!.id);
      const 상태 = await verify('판매 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('판매 오류 코드가 「NOT_SELLABLE」이다', await 오류코드(응답), 'NOT_SELLABLE');
      await verify('팔 수 없는 아이템을 팔면 409 「NOT_SELLABLE」이다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
