import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 캐릭터선택까지 } from './helpers/enter.helper.js';
import { 뜰때까지, 빠른시작버튼 } from './helpers/menu.helper.js';
import { 알림창 } from './pages/alert.page.js';
import { 캐릭터선택화면 } from './pages/char-select.page.js';

const 알림버튼 = defineCase({
  tcId: 'CGP-UI-101',
  name: '알림 창 버튼 반응',
  platforms: ['windows'],
  precondition: ['「알림」 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-013',
  name: '알림 창 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [알림버튼],
});

test(procedure, async ({ game }) => {
  await test.case(알림버튼, async () => {
    let 알림: 알림창 | null = null;

    await test.step('고양이 고르기 화면에서 「알림」 창을 띄운다', async () => {
      await 캐릭터선택까지(game);
      알림 = await 알림창.띄우기(game);
      await verify('「알림」 창이 열려 있다', 알림 !== null, true, { blocker: true });
    });
    await test.step('「알림」 창에서 「취소」를 누른다', async () => {
      let 닫힘 = false;
      if (알림 !== null) {
        await 알림.취소누르기();
        닫힘 = await 알림.닫힐때까지();
      }
      const 닫혔다 = await verify('창이 닫힌다', 닫힘, true);
      const 남았다 = await verify('캐릭터 선택에 남는다', await 뜰때까지(game, 캐릭터선택화면.조작안내.캐릭터선택, 5_000), true);
      await verify('「알림」 창에서 「취소」를 누르면 창이 닫히고 캐릭터 선택에 남는다', 닫혔다 && 남았다, true);
    });
    await test.step('고양이 고르기 화면에서 「알림」 창을 다시 띄운다', async () => {
      알림 = await 알림창.띄우기(game);
      await verify('「알림」 창이 열려 있다', 알림 !== null, true);
    });
    await test.step('「알림」 창에서 「확인」을 누른다', async () => {
      if (알림 !== null) await 알림.확인누르기();
      await verify('「알림」 창에서 「확인」을 누르면 메인 메뉴로 간다', await 뜰때까지(game, 빠른시작버튼, 30_000), true);
    });
  });
});
