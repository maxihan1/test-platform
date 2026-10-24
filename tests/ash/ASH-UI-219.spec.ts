import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-219',
  name: '월드 화면에 「물약」 버튼이 보이고 누를 수 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui219');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas');
      await verify('월드 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('월드 화면에서 「물약」 버튼을 확인한다', async () => {
      await verify('월드 화면에 「물약」 버튼이 보이고 누를 수 있다', (await new 월드화면(game).버튼('PotionButton'))?.interactable, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
