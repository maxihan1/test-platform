import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 가방채우기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-132',
  name: '40칸이 꽉 찬 가방에서 장착한 짧은 검을 해제해도 사용 칸이 40 이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터의 가방이 40칸 꽉 차 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('가방이 꽉 찬 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn132');
      await 가방채우기(admin, 누구, 0);
    });
    await test.step('가방이 40칸 꽉 차 있는지 확인한다', async () => {
      await verify('가방 사용 칸이 40 이다', (await 가방받기(request, 누구!)).used, 40, { blocker: true });
    });
    await test.step('장착한 짧은 검을 해제한다', async () => {
      const 칼 = 찾기(await 가방받기(request, 누구!), 'sword_short');
      const 응답 = await 해제하기(request, 누구!, 칼!.id);
      const 해제됨 = await verify('해제 응답이 성공이다', 응답.ok(), true);
      const 꽉참 = await verify('해제한 뒤 가방 사용 칸이 40 이다', (await 가방받기(request, 누구!)).used, 40);
      await verify('40칸이 꽉 찬 가방에서 장착한 짧은 검을 해제해도 사용 칸이 40 이다', 해제됨 && 꽉참, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
