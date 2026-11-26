import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 뜰때까지 } from './helpers/menu.helper.js';
import { 게임가이드창 } from './pages/guide.page.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';

const 가이드버튼 = defineCase({
  tcId: 'CGP-UI-104',
  name: '게임 가이드 버튼 반응',
  platforms: ['windows'],
  precondition: ['게임 가이드가 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-017',
  name: '게임 가이드 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [가이드버튼],
});

test(procedure, async ({ game }) => {
  await test.case(가이드버튼, async () => {
    await test.step('메인 메뉴에서 게임 가이드를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.가이드누르기();
      await verify('게임 가이드가 열려 있다', await 뜰때까지(game, 게임가이드창.목차띠), true, { blocker: true });
      const 배치 = await game.layout(게임가이드창.창);
      await verify('게임 가이드 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('게임 가이드에서 Esc 를 누른다', async () => {
      const 가이드 = await 게임가이드창.기다리기(game);
      await 가이드.닫기();
      await verify('게임 가이드에서 Esc 를 누르면 게임 가이드가 닫힌다', await 가이드.닫힐때까지(), true);
    });
    await test.step('메인 메뉴에서 게임 가이드를 다시 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.가이드누르기();
      await 게임가이드창.기다리기(game);
    });
    await test.step('게임 가이드에서 위쪽 탭 「기본 조작」을 누른다', async () => {
      const 가이드 = await 게임가이드창.기다리기(game);
      await verify('게임 가이드에서 위쪽 탭 「기본 조작」을 누르면 그 장이 열린다', await 가이드.기본조작열기(), true);
    });
  });
});
