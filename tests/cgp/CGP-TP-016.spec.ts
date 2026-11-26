import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 열린환경설정창, 환경설정창열기 } from './helpers/menu-flow.helper.js';

const 설정버튼 = defineCase({
  tcId: 'CGP-UI-103',
  name: '「환경설정」 창에서 닫기 버튼을 누르면 창이 닫힌다',
  platforms: ['windows'],
  precondition: ['「환경설정」 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-016',
  name: '환경설정 버튼 반응',
  platforms: ['windows'],
  precondition: [],
  cases: [설정버튼],
});

test(procedure, async ({ game }) => {
  await test.case(설정버튼, async () => {
    await test.step('메인 메뉴에서 「환경설정」 창을 연다', async () => {
      const 창 = await 환경설정창열기(game);
      await verify('「환경설정」 창이 열려 있다', await 창.열렸나(), true, { blocker: true });
    });
    await test.step('「환경설정」 창에서 닫기 버튼을 누른다', async () => {
      const 창 = await 열린환경설정창(game);
      await 창.닫기();
      await verify('「환경설정」 창에서 닫기 버튼을 누르면 창이 닫힌다', await 창.닫힐때까지(), true);
    });
  });
});
