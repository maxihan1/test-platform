import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { PK요약줄 } from './pages/pk-summary.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-234',
  name: '캐릭터 정보 창에서 「PK 기록」을 누르면 요약 줄에 「처치 0 · 사망 0 · 성향치 0 선량」이 보인다',
  platforms: ['android'],
  precondition: ['처치 · 사망이 없고 성향치가 0 인 새 전사 캐릭터로 게임에 들어와 캐릭터 정보 창을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui234');
    });
    await test.step('새 전사 캐릭터의 성향치를 확인한다', async () => {
      await verify('새 전사 캐릭터의 성향치가 0 이다', (await 캐릭터정보받기(request, 누구!)).alignment.value, 0, { blocker: true });
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 캐릭터 정보 창을 연다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 캐릭터정보창.열기(game);
      await verify('캐릭터 정보 창이 보인다', await 창.떠있나(), true, { blocker: true });
    });
    await test.step('캐릭터 정보 창에서 「PK 기록」을 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('PkTab');
      const 요약 = new PK요약줄(game);
      await 요약.뜰때까지();
      await verify('캐릭터 정보 창에서 「PK 기록」을 누르면 요약 줄에 「처치 0 · 사망 0 · 성향치 0 선량」이 보인다', await 요약.보이는글(), '처치 0 · 사망 0 · 성향치 0 선량');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
