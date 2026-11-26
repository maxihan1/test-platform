import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 가이드장제목들, 일시정지버튼읽기 } from './helpers/screen-read.helper.js';
import { 튜토리얼까지 } from './helpers/enter.helper.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 일시정지창 } from './pages/pause.page.js';

const 일시정지버튼 = defineCase({
  tcId: 'CGP-FN-196',
  name: '튜토리얼에서 Esc 를 누르면 일시정지 창에 「돌아가기」 · 「게임 가이드」 · 「환경설정」 · 「메인메뉴」 버튼이 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 가이드일곱장 = defineCase({
  tcId: 'CGP-FN-286',
  name: '튜토리얼 일시정지 창에서 「게임 가이드」를 누르면 메인 메뉴와 같은 일곱 장이 보인다',
  platforms: ['windows'],
  precondition: ['튜토리얼 일시정지 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-004',
  name: '튜토리얼 일시정지 — 버튼 보기부터 게임 가이드까지',
  platforms: ['windows'],
  precondition: [],
  cases: [일시정지버튼, 가이드일곱장],
});

test(procedure, async ({ game }) => {
  await test.case(일시정지버튼, async () => {
    await test.step('게임에서 메인 메뉴를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await verify('메인 메뉴에 「빠른시작」 버튼이 보인다', await 메뉴.보이나(메인메뉴화면.버튼글.빠른시작), true, { blocker: true });
    });
    await test.step('튜토리얼에 들어가 Esc 를 누른다', async () => {
      await 튜토리얼까지(game);
      const 창 = await 일시정지버튼읽기(game);
      const 열림 = await verify('일시정지 창이 보인다', 창.열림, true);
      const 돌아가기 = await verify('「돌아가기」 버튼이 보인다', 창.글.돌아가기, '돌아가기');
      const 가이드 = await verify('「게임 가이드」 버튼이 보인다', 창.글['게임 가이드'], '게임 가이드');
      const 환경설정 = await verify('「환경설정」 버튼이 보인다', 창.글.환경설정, '환경설정');
      const 메인메뉴 = await verify('「메인메뉴」 버튼이 보인다', 창.글.메인메뉴, '메인메뉴');
      const 배치 = await game.layout(일시정지창.창);
      await verify('일시정지 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '튜토리얼에서 Esc 를 누르면 일시정지 창에 「돌아가기」 · 「게임 가이드」 · 「환경설정」 · 「메인메뉴」 버튼이 보인다',
        열림 && 돌아가기 && 가이드 && 환경설정 && 메인메뉴,
        true,
      );
    });
  });

  await test.case(가이드일곱장, async () => {
    await test.step('튜토리얼에서 일시정지 창을 연다', async () => {
      await 일시정지창.열기(game);
    });
    await test.step('튜토리얼 일시정지 창에서 「게임 가이드」를 누른다', async () => {
      const 창 = await 일시정지창.열기(game);
      await 창.누르기('게임 가이드');
      const 떴나 = await verify('게임 가이드 창이 보인다', await 창.가이드뜰때까지(), true);
      const 장 = await 가이드장제목들(game);
      const 첫째 = await verify('「게임 목표와 규칙」 장이 보인다', 장[0], '게임 목표와 규칙');
      const 둘째 = await verify('「조작법」 장이 보인다', 장[1], '조작법');
      const 셋째 = await verify('「폭탄 던지기」 장이 보인다', 장[2], '폭탄 던지기');
      const 넷째 = await verify('「고기와 식물 키우기」 장이 보인다', 장[3], '고기와 식물 키우기');
      const 다섯째 = await verify('「화면 보기」 장이 보인다', 장[4], '화면 보기');
      const 여섯째 = await verify('「식물」 장이 보인다', 장[5], '식물');
      const 일곱째 = await verify('「나눔 플레이 경쟁」 장이 보인다', 장[6], '나눔 플레이 경쟁');
      const 배치 = await game.layout(일시정지창.가이드);
      await verify('게임 가이드 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '튜토리얼 일시정지 창에서 「게임 가이드」를 누르면 메인 메뉴와 같은 일곱 장이 보인다',
        떴나 && 첫째 && 둘째 && 셋째 && 넷째 && 다섯째 && 여섯째 && 일곱째,
        true,
      );
    });
  });
});
