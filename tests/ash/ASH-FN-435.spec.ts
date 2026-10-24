import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, 아이템번호 } from './helpers/admin.helper.js';
import { 오류, 장착하기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-435',
  name: '빨간 물약을 장착하면 409 「NOT_EQUIPPABLE」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['zone:Town', 'item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn435');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('빨간 물약을 장착한다', async () => {
      const 나 = 누구!;
      const 응답 = await 장착하기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'potion_hp_s'));
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 사유 = await verify('오류 코드가 「NOT_EQUIPPABLE」이다', (await 오류(응답)).code, 'NOT_EQUIPPABLE');
      await verify('빨간 물약을 장착하면 409 「NOT_EQUIPPABLE」이다', 코드 && 사유, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
