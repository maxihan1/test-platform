import { defineCase, test, verify } from '@platform/kit';

import { type 봇, type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 봇목록, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-105',
  name: '초록 들판 봇 머리 위에 「이름 Lv.N」 꼴 이름표가 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 후보: 봇[] = [];
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보내고 봇을 고른다', async () => {
      누구 = await 새캐릭터(admin, 'qaui105');
      await 순간이동(admin, 누구, 'Beginner');
      await 살아있는봇(admin, 누구, 'Beginner');
      후보 = (await 봇목록(admin, 누구, 'Beginner')).filter((b) => !b.isDead);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
    });
    await test.step('초록 들판 봇 이름표를 읽는다', async () => {
      const 월드 = new 월드화면(game);
      const 보이는 = await 월드.보이는봇(후보);
      const 봇값 = 후보.find((b) => b.id === 보이는.id)!;
      const 글 = await 월드.이름표글(월드.봇이름표(봇값.id, 봇값.name));
      await verify('초록 들판 봇 머리 위에 「이름 Lv.N」 꼴 이름표가 보인다', 글, `${봇값.name} Lv.${String(봇값.level)}`);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
