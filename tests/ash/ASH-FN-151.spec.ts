import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 성향주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 상점목록받기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-151',
  name: '악명 캐릭터가 300 골드 짧은 검을 사면 1.2배인 360 골드를 낸다',
  platforms: ['android'],
  precondition: ['성향치 −1 인 새 전사 캐릭터가 있다'],
  elements: ['item:sword_short', 'state:성향=악명', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −1 인 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn151');
      await 성향주기(admin, 누구, -1);
    });
    await test.step('새 캐릭터의 성향치를 확인한다', async () => {
      await verify('새 캐릭터의 성향치가 −1 이다', (await 캐릭터읽기(admin, 누구!)).alignment.value, -1, { blocker: true });
    });
    await test.step('짧은 검을 산다', async () => {
      const 전 = (await 캐릭터읽기(admin, 누구!)).gold;
      const 응답 = await 구매하기(request, 누구!, 'sword_short');
      const 샀다 = await verify('구매 응답이 성공이다', 응답.ok(), true);
      const 낸골드 = await verify('낸 골드가 360 이다', 전 - (await 캐릭터읽기(admin, 누구!)).gold, 360);
      await verify('악명 캐릭터가 300 골드 짧은 검을 사면 1.2배인 360 골드를 낸다', 샀다 && 낸골드, true);
    });
    await test.step('상점 목록을 받는다', async () => {
      await verify('악명 캐릭터로 상점 목록을 받으면 priceMultiplier 가 1.2 다', (await 상점목록받기(request, 누구!)).priceMultiplier, 1.2);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
