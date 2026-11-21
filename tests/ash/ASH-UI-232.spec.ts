import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-232',
  name: '초록 들판 월드 화면의 임프 머리 위에 「임프 Lv.3」 이름표가 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판 임프 스폰 앞에 있다'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰번호 = '';
  try {
    await test.step('새 전사 캐릭터를 만들어 초록 들판 임프 스폰 앞으로 옮긴다', async () => {
      누구 = await 새캐릭터(admin, 'qaui232');
      const 스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      스폰번호 = 스폰값.id;
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
    });
    await test.step('월드 화면에서 임프 이름표를 확인한다', async () => {
      const 월드 = new 월드화면(game);
      const 주소 = 월드.몬스터이름표(스폰번호, 'Imp');
      await 월드.이름표뜰때까지(주소);
      await verify('초록 들판 월드 화면의 임프 머리 위에 「임프 Lv.3」 이름표가 보인다', await 월드.이름표글(주소), '임프 Lv.3');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
