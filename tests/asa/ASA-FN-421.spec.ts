import { defineCase, test, verify } from '@platform/kit';

import { 결과고정넣기, 결과고정비우기, 결과고정읽기, 어드민가방읽기, 어드민아이템주기 } from './helpers/admin.helper.js';
import { 새아이템찾기, type 강화응답 } from './helpers/enhance.helper.js';
import { 강화, 값읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-421',
  name: '결과 고정에 「Destroy」를 넣고 +0 장비를 강화하면 결과가 「Success」다',
  apiDoc: 1,
  precondition: ['+0 짧은 검과 무기 강화 주문서를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;
  let 검번호 = 0;
  let 주문서번호 = 0;
  let 비웠다 = false;

  await test.step('일회용 캐릭터에게 +0 짧은 검과 무기 강화 주문서를 준다', async () => {
    나 = await 플레이어만들기(request);
    await 어드민아이템주기(admin, 나.캐릭터번호, 'sword_short', 1, 0);
    await 어드민아이템주기(admin, 나.캐릭터번호, 'scroll_weapon', 1);
  });

  await test.step('+0 짧은 검과 무기 강화 주문서를 확인한다', async () => {
    const 가방 = await 어드민가방읽기(admin, 나.캐릭터번호);
    검번호 = 새아이템찾기(가방, 'sword_short', 0)?.id ?? 0;
    주문서번호 = 새아이템찾기(가방, 'scroll_weapon')?.id ?? 0;
    await verify('가방에 +0 짧은 검이 있다', 검번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 무기 강화 주문서가 있다', 주문서번호 > 0, true, {
      blocker: true,
    });
  });

  try {
    await test.step('결과 고정에 「Destroy」를 넣고 +0 짧은 검을 강화한다', async () => {
      await 결과고정넣기(admin, ['Destroy']);
      const 값 = await 값읽기<Partial<강화응답>>(await 강화(request, 나, 검번호, 주문서번호));
      await verify('결과 고정에 「Destroy」를 넣고 +0 장비를 강화하면 결과가 「Success」다', 값.result, 'Success');
      const 남은것 = await 결과고정읽기(admin);
      await verify('안전 구간 강화 뒤에도 결과 고정에 「Destroy」가 남아 있다', 남은것.enhance.includes('Destroy'), true);
    });

    await test.step('결과 고정을 비운다', async () => {
      const 응답 = await 결과고정비우기(admin);
      비웠다 = true;
      await verify('결과 고정을 비우면 200 이 돌아온다', 응답.status(), 200);
    });
  } finally {
    if (!비웠다) await 결과고정비우기(admin);
  }
});
