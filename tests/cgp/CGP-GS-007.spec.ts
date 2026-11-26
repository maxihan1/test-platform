import { defineCase, repeatUntil, test, verify } from '@platform/kit';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 메인메뉴로 } from './helpers/menu.helper.js';
import { 버티기조각, 판끝났나 } from './helpers/play.helper.js';
import { 결과창 } from './pages/ending.page.js';

export const spec = defineCase({
  tcId: 'CGP-GS-007',
  name: '내 식물이 잡은 악마도 결과 창 총점에 든다',
  platforms: ['windows'],
  precondition: ['첫 맵 1P 스테이지 · 고기 20'],
  held: '보류 — 식물 하나가 악마를 잡게 하는 자리를 못 찾았다',
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.cleanup('스테이지에서 메인 메뉴로 나가기', async () => {
    await 메인메뉴로(game);
  });

  await test.step('첫 맵 스테이지에 들어가 식물 하나를 심는다', async () => {
    const 스테이지 = await 스테이지까지(game);
    await verify('고기가 20이다', await 스테이지.고기수(), 20, { blocker: true });
    await 스테이지.자리에심기([18.2, 27.0]);
  });

  await test.step('길 옆에 식물 하나를 심고 세계수가 무너질 때까지 둔다', async () => {
    const 체력들: number[] = [];
    await repeatUntil(() => 버티기조각(game, 5, 체력들), {
      progress: async () => ((await 판끝났나(game)) ? 1 : 0),
      goal: 1,
      stallMs: 150_000,
    });
    const 결과 = await 결과창.넘기기(game);
    const 식물 = 결과 === null ? Number.NaN : await 결과.점수('식물처치');
    const 총점 = 결과 === null ? Number.NaN : await 결과.점수('총점');
    const 잡음 = await verify('식물 처치가 1 이상이다', 식물 >= 1, true);
    const 듦 = await verify('총점이 식물 처치보다 작지 않다', 총점 >= 식물, true);
    await verify('내 식물이 잡은 악마도 결과 창 총점에 든다', 잡음 && 듦, true);
  });
});
