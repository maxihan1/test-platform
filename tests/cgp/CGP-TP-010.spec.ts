import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 뜰때까지 } from './helpers/menu.helper.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';

const 패드그림 = defineCase({
  tcId: 'CGP-FN-214',
  name: '메인 메뉴에서 패드를 누르면 화면의 버튼 그림이 패드 그림으로, 키보드를 누르면 키보드 그림으로 바뀐다',
  platforms: ['windows-switch'],
  precondition: ['패드가 연결돼 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-010',
  name: '패드 버튼 그림',
  platforms: ['windows-switch'],
  precondition: [],
  cases: [패드그림],
});

test(procedure, async ({ game }) => {
  await test.case(패드그림, async () => {
    await test.step('게임에서 메인 메뉴를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await verify('패드가 연결돼 있다', (await game.pad()).type !== 'off', true, { blocker: true });
      await verify('메인 메뉴가 보인다', await 메뉴.보이나(메인메뉴화면.버튼글.빠른시작), true, { blocker: true });
    });
    await test.step('메인 메뉴에서 패드 버튼을 누른 뒤 키보드를 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.패드버튼누르기();
      const 패드그림보임 = await verify('가이드 버튼에 패드 그림이 보인다', await 뜰때까지(game, 메인메뉴화면.가이드패드그림), true);
      const 패드안내보임 = await verify('패드 조작 안내가 보인다', await 뜰때까지(game, 메인메뉴화면.패드안내), true);
      await 메뉴.키보드누르기();
      const 키보드그림보임 = await verify('가이드 버튼에 키보드 그림이 보인다', await 뜰때까지(game, 메인메뉴화면.가이드키보드그림), true);
      const 키보드안내보임 = await verify('키보드 조작 안내가 보인다', await 뜰때까지(game, 메인메뉴화면.키보드안내), true);
      await verify(
        '메인 메뉴에서 패드를 누르면 화면의 버튼 그림이 패드 그림으로, 키보드를 누르면 키보드 그림으로 바뀐다',
        패드그림보임 && 패드안내보임 && 키보드그림보임 && 키보드안내보임,
        true,
      );
    });
  });
});
