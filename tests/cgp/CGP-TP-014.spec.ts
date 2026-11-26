import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 메인메뉴로갔나, 일시정지창뜨나, 튜토리얼이어지나 } from './helpers/screen-read.helper.js';
import { 튜토리얼까지 } from './helpers/enter.helper.js';
import { 일시정지창 } from './pages/pause.page.js';
import { 튜토리얼장면 } from './pages/tutorial.page.js';

const 튜토리얼일시정지버튼 = defineCase({
  tcId: 'CGP-UI-098',
  name: '튜토리얼 일시정지 버튼 반응',
  platforms: ['windows'],
  precondition: ['튜토리얼 일시정지 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-014',
  name: '튜토리얼 일시정지 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [튜토리얼일시정지버튼],
});

test(procedure, async ({ game }) => {
  await test.case(튜토리얼일시정지버튼, async () => {
    await test.step('메인 메뉴에서 튜토리얼에 들어가 일시정지 창을 연다', async () => {
      await 튜토리얼까지(game);
      await verify('튜토리얼 일시정지 창이 보인다', await 일시정지창뜨나(game), true, { blocker: true });
    });
    await test.step('튜토리얼 일시정지 창에서 「돌아가기」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('돌아가기');
      const 닫힘 = await verify('일시정지 창이 닫힌다', await 창.닫혔나(), true);
      const 이어짐 = await verify('튜토리얼 화면이 보인다', await 튜토리얼이어지나(game, 튜토리얼장면.장면), true);
      await verify('튜토리얼 일시정지 창에서 「돌아가기」를 누르면 창이 닫히고 튜토리얼이 이어진다', 닫힘 && 이어짐, true);
    });
    await test.step('튜토리얼 일시정지 창에서 「게임 가이드」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('게임 가이드');
      await verify('튜토리얼 일시정지 창에서 「게임 가이드」를 누르면 게임 가이드 창이 뜬다', await 창.가이드뜰때까지(), true);
      await 창.가이드닫기();
    });
    await test.step('튜토리얼 일시정지 창에서 「환경설정」을 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('환경설정');
      await verify('튜토리얼 일시정지 창에서 「환경설정」을 누르면 「환경설정」 창이 뜬다', await 창.환경설정뜰때까지(), true);
      await 창.환경설정닫기();
    });
    await test.step('튜토리얼 일시정지 창에서 「메인메뉴」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('메인메뉴');
      await verify('튜토리얼 일시정지 창에서 「메인메뉴」를 누르면 메인 메뉴로 간다', await 메인메뉴로갔나(game), true);
    });
  });
});
