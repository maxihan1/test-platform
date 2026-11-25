import { defineCase, test, verify } from '@platform/kit';

import { 튜토리얼까지 } from './helpers/enter.helper.js';
import { 튜토리얼막기, 튜토리얼여러걸음 } from './helpers/tutorial.helper.js';

export const spec = defineCase({
  tcId: 'CGP-GS-005',
  name: '튜토리얼 마지막 웨이브의 악마를 다 처치하면 「승 리」가 뜬다',
  platforms: ['windows'],
  precondition: ['메인 메뉴에서 「튜토리얼」로 들어간다 · 1인'],
  held: '보류 — 튜토리얼을 10판 다 이긴 작전이 없다',
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('메인 메뉴에서 「튜토리얼」로 들어가 「악마의 습격」까지 과제를 한다', async () => {
    const 장면 = await 튜토리얼까지(game);
    await verify('튜토리얼이 열려 있다', await 장면.떴나(), true, { blocker: true });
    await 튜토리얼여러걸음(game, 40);
  });

  await test.step('튜토리얼 마지막 웨이브 악마를 다 처치한다', async () => {
    const 판 = await 튜토리얼막기(game, 150);
    await verify('튜토리얼 마지막 웨이브의 악마를 다 처치하면 「승 리」가 뜬다', 판.이김, true);
  });
});
