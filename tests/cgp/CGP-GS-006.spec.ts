import { defineCase, test, verify } from '@platform/kit';

import { 결과창 } from './pages/ending.page.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 인원수선택창 } from './pages/player-count.page.js';

export const spec = defineCase({
  tcId: 'CGP-GS-006',
  name: '판이 끝나면 처치 점수로 등수를 매긴다',
  platforms: ['windows'],
  precondition: ['첫 맵 2인 이상 스테이지'],
  held: '보류 — 2인 이상 판을 끝까지 하는 길이 없다',
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('「인원수 선택」 창에서 「2P」로 두 자리를 참가시킨다', async () => {
    const 메뉴 = await 메인메뉴화면.열기(game);
    await 메뉴.빠른시작누르기();
    const 인원수 = await 인원수선택창.기다리기(game);
    await 인원수.누르기('2P');
    await verify('참가 창이 뜬다', await 인원수.참가창뜰때까지(), true, { blocker: true });
    await game.key('Q+E');
    await game.key('Pad.L+Pad.R');
  });

  await test.step('판을 끝까지 한다', async () => {
    const 결과 = await 결과창.넘기기(game);
    const 순위 = 결과 === null ? '' : (await game.text(결과창.내순위)).trim();
    await verify('판이 끝나면 처치 점수로 등수를 매긴다', 순위 !== '' && 순위 !== '-', true);
  });
});
