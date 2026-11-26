import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 인원수창열기 } from './helpers/menu-flow.helper.js';
import { 뜰때까지, 메인메뉴만떠있나 } from './helpers/menu.helper.js';
import { 캐릭터선택화면 } from './pages/char-select.page.js';

const 인원수버튼 = defineCase({
  tcId: 'CGP-UI-100',
  name: '인원수 선택 버튼 반응',
  platforms: ['windows'],
  precondition: ['「인원수 선택」 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-012',
  name: '인원수 선택 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [인원수버튼],
});

test(procedure, async ({ game }) => {
  await test.case(인원수버튼, async () => {
    await test.step('「인원수 선택」 창에서 「1P」를 누른다', async () => {
      const 창 = await 인원수창열기(game);
      await 창.누르기('1P');
      await verify(
        '「인원수 선택」 창에서 「1P」를 누르면 캐릭터 선택이 뜬다',
        await 뜰때까지(game, 캐릭터선택화면.조작안내.캐릭터선택, 15_000),
        true,
      );
    });
    await test.step('「인원수 선택」 창에서 「2P」를 누른다', async () => {
      const 창 = await 인원수창열기(game);
      await 창.누르기('2P');
      await verify('「인원수 선택」 창에서 「2P」를 누르면 참가 창이 뜬다', await 창.참가창뜰때까지(), true);
      await 창.참가창닫기();
    });
    await test.step('「인원수 선택」 창에서 Esc 를 누른다', async () => {
      const 창 = await 인원수창열기(game);
      await 창.닫기();
      await 창.닫힐때까지();
      await verify('「인원수 선택」 창에서 Esc 를 누르면 메인 메뉴로 돌아간다', await 메인메뉴만떠있나(game), true);
    });
  });
});
