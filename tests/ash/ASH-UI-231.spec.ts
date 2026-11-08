import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 미니맵 } from './pages/minimap.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-231',
  name: '초록 들판 월드 화면의 미니맵에 점이 하나 이상 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만들어 초록 들판으로 옮긴다', async () => {
      누구 = await 새캐릭터(admin, 'qaui231');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
    });
    await test.step('월드 화면의 미니맵을 확인한다', async () => {
      await verify('초록 들판 월드 화면의 미니맵에 점이 하나 이상 보인다', await new 미니맵(game).점있나(), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
