import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 골드주기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { 골드내역줄 } from './pages/gold-ledger.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-684',
  name: '어드민으로 골드를 1,500 으로 바꾼 뒤 「골드 내역」을 누르면 맨 위 줄이 시각 · 사유 · 「+1,000」 · 「잔액 1,500」 차례로 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터의 골드를 어드민으로 1,500 으로 바꿨다'],
  elements: ['flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만들어 골드를 1,500 으로 바꾼다', async () => {
      누구 = await 새캐릭터(admin, 'qafn684');
      await 골드주기(admin, 누구, 1500);
    });
    await test.step('게임에 들어가 캐릭터 정보 창을 연다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 골드에 「1,500」이 보인다', await 월드.골드글(), '1,500', { blocker: true });
      await 캐릭터정보창.열기(game);
    });
    await test.step('게임에 들어가 캐릭터 정보 창에서 「골드 내역」을 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('LedgerTab');
      const 내역 = new 골드내역줄(game);
      await 내역.뜰때까지(1);
      const 칸 = await 내역.칸(0);
      const 시각 = await verify('맨 위 줄 첫 칸이 「월-일 시:분:초」 꼴의 시각이다', /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(칸.시각), true);
      const 사유 = await verify('맨 위 줄 둘째 칸에 사유가 보인다', 칸.사유 !== '', true);
      const 금액 = await verify('맨 위 줄 셋째 칸이 「+1,000」이다', 칸.금액, '+1,000');
      const 잔액 = await verify('맨 위 줄 넷째 칸이 「잔액 1,500」이다', 칸.잔액, '잔액 1,500');
      await verify('어드민으로 골드를 1,500 으로 바꾼 뒤 「골드 내역」을 누르면 맨 위 줄이 시각 · 사유 · 「+1,000」 · 「잔액 1,500」 차례로 보인다', 시각 && 사유 && 금액 && 잔액, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
