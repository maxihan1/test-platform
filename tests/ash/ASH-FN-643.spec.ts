import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 강화기록수, 강화기록이멈출때까지, 누르고결과뜰때까지 } from './helpers/enhance-lock.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 골드주기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청 } from './helpers/shop.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-643',
  name: '강화 결과가 뜨고 0.5초가 지난 뒤 「강화하기」를 다시 누르면 강화가 한 번 더 된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 롱 소드와 무기 강화 주문서를 가지고 하늘빛 마을에 있다', '새 전사 캐릭터가 롱 소드와 무기 강화 주문서를 가지고 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 칼 = 0;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드 두 자루와 무기 강화 주문서 · 강화할 골드를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn643');
      await 골드주기(admin, 누구, 50_000);
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 5 });
      칼 = (await 가방읽기(admin, 누구)).items.find((i) => i.templateId === 'sword_long')!.id;
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 강화 창에서 롱 소드를 고른다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 강화창.열기(game);
      await 창.장비고르기(칼);
      await verify('강화 창 설명에 강화 비용이 보인다', (await 창.설명글()).includes('강화 비용'), true, { blocker: true });
    });
    await test.step('강화 창에서 「강화하기」를 누르고 강화 결과가 뜬 뒤 1초를 기다렸다가 다시 누른다', async () => {
      const 창 = new 강화창(game);
      const 앞 = await 강화기록수(admin, 누구!);
      await 누르고결과뜰때까지(창);
      await new Promise((깨운다) => setTimeout(깨운다, 1_000));
      await 창.강화누르기();
      const 뒤 = await 강화기록이멈출때까지(admin, 누구!, 앞 + 1);
      await verify('강화 결과가 뜨고 0.5초가 지난 뒤 「강화하기」를 다시 누르면 강화가 한 번 더 된다', 뒤 - 앞, 2);
    });
    await test.step('버튼을 거치지 않고 서버에 롱 소드 강화 요청을 두 번 연달아 보낸다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 다른칼 = 가방값.items.find((i) => i.templateId === 'sword_long' && i.id !== 칼)!.id;
      const 주문서 = 찾기(가방값, 'scroll_weapon')!.id;
      const 앞 = await 강화기록수(admin, 누구!);
      const 첫째 = await 강화요청(request, 누구!, 다른칼, 주문서);
      const 둘째 = await 강화요청(request, 누구!, 다른칼, 주문서);
      await verify('첫째 강화 요청에 서버가 성공 응답을 준다', 첫째.status(), 200, { blocker: true });
      await verify('둘째 강화 요청에 서버가 성공 응답을 준다', 둘째.status(), 200, { blocker: true });
      await verify('버튼을 거치지 않고 서버에 연달아 보낸 강화 요청 두 번은 모두 처리된다', (await 강화기록수(admin, 누구!)) - 앞, 2);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
