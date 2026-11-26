import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 뜰때까지 } from './helpers/menu.helper.js';
import { 게임가이드창 } from './pages/guide.page.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 인원수선택창 } from './pages/player-count.page.js';
import { 환경설정창 } from './pages/setting.page.js';
import { 튜토리얼장면 } from './pages/tutorial.page.js';

const 메뉴버튼 = defineCase({
  tcId: 'CGP-UI-099',
  name: '메인 메뉴 버튼 반응',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-011',
  name: '메인 메뉴 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [메뉴버튼],
});

test(procedure, async ({ game }) => {
  await test.case(메뉴버튼, async () => {
    await test.step('메인 메뉴에서 「빠른시작」을 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.빠른시작누르기();
      await verify('메인 메뉴에서 「빠른시작」을 누르면 「인원수 선택」 창이 뜬다', await 뜰때까지(game, 인원수선택창.제목), true);
    });
    await test.step('메인 메뉴에서 「환경설정」을 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.환경설정누르기();
      const 창 = await 환경설정창.기다리기(game);
      await verify('메인 메뉴에서 「환경설정」을 누르면 「환경설정」 창이 뜬다', await 창.열렸나(), true);
    });
    await test.step('메인 메뉴에서 「Q」를 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.가이드누르기();
      await verify('메인 메뉴에서 「Q」를 누르면 게임 가이드가 뜬다', await 뜰때까지(game, 게임가이드창.목차띠), true);
    });
    await test.step('메인 메뉴에서 「튜토리얼」을 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.튜토리얼누르기();
      await verify('메인 메뉴에서 「튜토리얼」을 누르면 튜토리얼이 열린다', await 뜰때까지(game, 튜토리얼장면.장면, 30_000), true);
    });
  });
});
