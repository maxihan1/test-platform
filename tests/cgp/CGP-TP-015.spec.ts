import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 글이바뀌었나, 메인메뉴로갔나, 읽기, 일시정지창뜨나, 캐릭터선택으로갔나 } from './helpers/screen-read.helper.js';
import { 스테이지까지 } from './helpers/enter.helper.js';
import { 일시정지창 } from './pages/pause.page.js';
import { 스테이지화면 } from './pages/stage.page.js';

const 스테이지일시정지버튼 = defineCase({
  tcId: 'CGP-UI-102',
  name: '스테이지 일시정지 버튼 반응',
  platforms: ['windows'],
  precondition: ['스테이지 일시정지 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-015',
  name: '스테이지 일시정지 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [스테이지일시정지버튼],
});

test(procedure, async ({ game }) => {
  await test.case(스테이지일시정지버튼, async () => {
    await test.step('메인 메뉴에서 스테이지에 들어가 일시정지 창을 연다', async () => {
      await 스테이지까지(game);
      await verify('스테이지 일시정지 창이 보인다', await 일시정지창뜨나(game), true, { blocker: true });
    });
    await test.step('스테이지 일시정지 창에서 「돌아가기」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      const 앞 = await 읽기(game, 스테이지화면.남은시간);
      await 창.누르기('돌아가기');
      const 닫힘 = await verify('일시정지 창이 닫힌다', await 창.닫혔나(), true);
      const 이어짐 = await verify('스테이지의 남은 시간이 다시 흐른다', await 글이바뀌었나(game, 스테이지화면.남은시간, 앞, 8_000), true);
      await verify('스테이지 일시정지 창에서 「돌아가기」를 누르면 창이 닫히고 스테이지가 이어진다', 닫힘 && 이어짐, true);
    });
    await test.step('스테이지 일시정지 창에서 「게임 가이드」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('게임 가이드');
      await verify('스테이지 일시정지 창에서 「게임 가이드」를 누르면 게임 가이드 창이 뜬다', await 창.가이드뜰때까지(), true);
      await 창.가이드닫기();
    });
    await test.step('스테이지 일시정지 창에서 「환경설정」을 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('환경설정');
      await verify('스테이지 일시정지 창에서 「환경설정」을 누르면 「환경설정」 창이 뜬다', await 창.환경설정뜰때까지(), true);
      await 창.환경설정닫기();
    });
    await test.step('스테이지 일시정지 창에서 「로비」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('로비');
      await verify('스테이지 일시정지 창에서 「로비」를 누르면 캐릭터 선택으로 간다', await 캐릭터선택으로갔나(game), true);
    });
    await test.step('캐릭터 선택에서 스테이지에 다시 들어가 일시정지 창을 연다', async () => {
      await 스테이지까지(game);
      await 일시정지창.열기(game);
    });
    await test.step('스테이지 일시정지 창에서 「메인메뉴」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('메인메뉴');
      await verify('스테이지 일시정지 창에서 「메인메뉴」를 누르면 메인 메뉴로 간다', await 메인메뉴로갔나(game), true);
    });
  });
});
