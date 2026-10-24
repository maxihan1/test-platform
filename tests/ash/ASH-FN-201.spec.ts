import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 골드주기, 새캐릭터, 설정읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-201',
  name: '목표 +7 강화가 실패로 고정되면 강화 창에 실패가 보이고 롱 소드가 +6 그대로다',
  platforms: ['android'],
  precondition: [
    '새 전사 캐릭터로 게임에 들어와 +6 롱 소드를 가지고 있고 강화 결과가 실패로 고정돼 있다',
    '새 전사 캐릭터로 게임에 들어와 +6 롱 소드를 가지고 있고 강화 결과가 파괴로 고정돼 있다',
  ],
  techniques: ['결정 테이블'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_7', 'npc:강화사', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 칼번호 = 0;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn201');
      await 골드주기(admin, 누구, 100_000);
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 2 });
      const 칼 = (await 아이템주기(admin, 누구, 'sword_long', { 강화: 6 })).items.find((i) => i.templateId === 'sword_long');
      if (칼 === undefined) throw new Error('롱 소드를 가방에 넣지 못했다');
      칼번호 = 칼.id;
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('강화 결과를 실패로 고정한다', async () => {
      await 결과고정비우기(admin);
      await 결과고정(admin, { enhance: ['Fail'] });
    });
    await test.step('+6 롱 소드와 실패 고정을 확인한다', async () => {
      await verify('강화 결과가 실패로 고정돼 있다', (await 설정읽기(admin)).forced.enhance, ['Fail'], { blocker: true });
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('가방에 +6 롱 소드가 있다', 가방값.items.find((i) => i.id === 칼번호)?.enhanceLevel, 6, { blocker: true });
    });
    await test.step('강화 창에서 +6 롱 소드를 실패로 강화한다', async () => {
      const 창 = await 강화창.열기(game);
      await 창.장비고르기(칼번호);
      const 결과글 = await 창.강화하기();
      const 화면 = await verify('강화 창에 실패가 보인다', 결과글.includes('실패'), true);
      const 이름 = await verify('강화 창의 롱 소드 줄이 +6 롱 소드다', await 창.장비이름(칼번호), '+6 롱 소드');
      const 가방값 = await 가방읽기(admin, 누구!);
      const 서버 = await verify('가방의 롱 소드가 +6 이다', 가방값.items.find((i) => i.id === 칼번호)?.enhanceLevel, 6);
      await verify('목표 +7 강화가 실패로 고정되면 강화 창에 실패가 보이고 롱 소드가 +6 그대로다', 화면 && 이름 && 서버, true);
      await 창.닫기누르기();
    });
    await test.step('강화 결과를 파괴로 고정한다', async () => {
      await 결과고정(admin, { enhance: ['Destroy'] });
    });
    await test.step('+6 롱 소드와 파괴 고정을 확인한다', async () => {
      await verify('강화 결과가 파괴로 고정돼 있다', (await 설정읽기(admin)).forced.enhance, ['Destroy'], { blocker: true });
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('가방에 그대로인 +6 롱 소드가 있다', 가방값.items.find((i) => i.id === 칼번호)?.enhanceLevel, 6, { blocker: true });
    });
    await test.step('강화 창에서 +6 롱 소드를 파괴로 강화한다', async () => {
      const 창 = await 강화창.열기(game);
      await 창.장비고르기(칼번호);
      await 창.강화하기();
      await game.waitFor(창.장비줄(칼번호), { gone: true });
      const 화면 = await verify('강화 창 목록에서 롱 소드가 사라진다', await 창.장비있나(칼번호), false);
      const 가방값 = await 가방읽기(admin, 누구!);
      const 서버 = await verify('가방에서 롱 소드가 사라진다', 가방값.items.some((i) => i.id === 칼번호), false);
      await verify('목표 +7 강화가 파괴로 고정되면 강화 창 목록과 가방에서 롱 소드가 사라진다', 화면 && 서버, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
