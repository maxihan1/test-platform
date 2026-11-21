import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { 골드내역줄 } from './pages/gold-ledger.page.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-686',
  name: 'GM 콘솔로 골드를 지급한 뒤 「골드 내역」을 누르면 맨 위 줄 사유가 「GM 지급」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['flow:골드-GM'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn686');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('GM 콘솔에서 골드 1,000 을 지급하고 캐릭터 정보 창에서 「골드 내역」을 누른다', async () => {
      const 콘솔 = await GM콘솔.열기(game);
      await 콘솔.골드지급(1000);
      await game.waitFor(`${월드화면.상태칸}/GoldText`, { text: '1,500' });
      await 콘솔.닫기누르기();
      await 콘솔.닫힐때까지();
      const 창 = await 캐릭터정보창.열기(game);
      await 창.탭누르기('LedgerTab');
      const 내역 = new 골드내역줄(game);
      await 내역.뜰때까지(1);
      await verify('GM 콘솔로 골드를 지급한 뒤 「골드 내역」을 누르면 맨 위 줄 사유가 「GM 지급」이다', (await 내역.칸(0)).사유, 'GM 지급');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
