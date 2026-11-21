import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 구역안내띠 } from './pages/zone-toast.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-230',
  name: 'GM 콘솔에서 「초록 들판」을 누르면 「초록 들판에 들어섰습니다.」 안내 띠가 뜬다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui230');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('GM 콘솔에서 「초록 들판」을 누른다', async () => {
      const 콘솔 = await GM콘솔.열기(game);
      const 띠 = new 구역안내띠(game);
      await 콘솔.순간이동누르기('TeleportBeginner');
      const 글들 = await 띠.뜬글들모으기();
      await verify('GM 콘솔에서 「초록 들판」을 누르면 「초록 들판에 들어섰습니다.」 안내 띠가 뜬다', 글들.includes('초록 들판에 들어섰습니다.'), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
