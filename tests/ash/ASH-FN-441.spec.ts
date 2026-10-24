import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, 쓰기, 아이템번호 } from './helpers/admin.helper.js';
import { 오류, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-441',
  name: '소모품이 아닌 짧은 검을 쓰면 409 「NOT_USABLE」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['동등 분할'],
  elements: ['zone:Town', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn441');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('짧은 검을 쓴다', async () => {
      const 나 = 누구!;
      const 응답 = await 쓰기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'sword_short'));
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 사유 = await verify('오류 코드가 「NOT_USABLE」이다', (await 오류(응답)).code, 'NOT_USABLE');
      await verify('소모품이 아닌 짧은 검을 쓰면 409 「NOT_USABLE」이다', 코드 && 사유, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
