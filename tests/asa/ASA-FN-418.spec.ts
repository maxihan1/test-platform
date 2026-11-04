import { defineCase, test, verify } from '@platform/kit';

import { 남은강화고정비우기, 결과고정넣기, 어드민가방읽기, 어드민아이템주기, 어드민캐릭터고치기 } from './helpers/admin.helper.js';
import { 새아이템찾기, type 강화응답 } from './helpers/enhance.helper.js';
import { 강화, 값읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-418',
  name: '결과 고정에 「Fail」 · 「Success」를 넣고 두 번 강화하면 첫 결과가 「Fail」이다',
  apiDoc: 1,
  precondition: ['+5 짧은 검과 무기 강화 주문서 2장을 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;
  let 검번호 = 0;
  let 주문서번호 = 0;

  await test.step('일회용 캐릭터에게 골드와 +5 짧은 검 · 무기 강화 주문서 2장을 준다', async () => {
    나 = await 플레이어만들기(request);
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 5000 });
    await 어드민아이템주기(admin, 나.캐릭터번호, 'sword_short', 1, 5);
    await 어드민아이템주기(admin, 나.캐릭터번호, 'scroll_weapon', 2);
  });

  await test.step('+5 짧은 검과 무기 강화 주문서 2장을 확인한다', async () => {
    const 가방 = await 어드민가방읽기(admin, 나.캐릭터번호);
    const 검 = 새아이템찾기(가방, 'sword_short', 5);
    const 주문서 = 새아이템찾기(가방, 'scroll_weapon');
    검번호 = 검?.id ?? 0;
    주문서번호 = 주문서?.id ?? 0;
    await verify('가방에 +5 짧은 검이 있다', 검번호 > 0, true, {
      blocker: true,
    });
    await verify('무기 강화 주문서가 2장이다', 주문서?.quantity, 2, {
      blocker: true,
    });
  });

  try {
    await test.step('결과 고정에 「Fail」 · 「Success」를 넣고 +5 짧은 검을 두 번 강화한다', async () => {
      await 결과고정넣기(admin, ['Fail', 'Success']);
      const 첫째 = await 값읽기<Partial<강화응답>>(await 강화(request, 나, 검번호, 주문서번호));
      const 둘째 = await 값읽기<Partial<강화응답>>(await 강화(request, 나, 검번호, 주문서번호));
      await verify('결과 고정에 「Fail」 · 「Success」를 넣고 두 번 강화하면 첫 결과가 「Fail」이다', 첫째.result, 'Fail');
      await verify('둘째 강화 결과가 「Success」다', 둘째.result, 'Success');
    });
  } finally {
    await 남은강화고정비우기(admin);
  }
});
