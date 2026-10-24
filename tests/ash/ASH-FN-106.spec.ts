import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장비수치읽기, 표읽기 } from './helpers/shop.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-106',
  name: '무기 줄마다 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:sword_short', 'item:sword_long', 'item:axe_battle', 'item:bow_short', 'item:bow_long', 'item:staff_oak', 'npc:상인'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 궁수: 캐릭터 | undefined;
  let 마법사: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터와 무기를 입어 볼 궁수 · 마법사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn106');
      궁수 = await 새캐릭터(admin, 'qafn106', 'Archer');
      마법사 = await 새캐릭터(admin, 'qafn106', 'Mage');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('상점 목록 · 가방 · 템플릿을 받아 무기 줄을 견준다', async () => {
      const 번호들 = ['sword_short', 'sword_long', 'axe_battle', 'bow_short', 'bow_long', 'staff_oak'];
      const 후보들 = [누구!, 궁수!, 마법사!];
      const 표 = await 표읽기(request, admin, 누구!, 번호들);
      const 공격력 = async (번호: string): Promise<number> => 장비수치읽기(request, admin, 후보들, 번호, '공격력');
      const 짧은검 = await verify.element('짧은 검 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:sword_short', { ...표.sword_short, 공격력: await 공격력('sword_short') }, { 상점: true, 공격력: 8, 구매가: 300, 판매가: 100 });
      const 롱소드 = await verify.element('롱 소드 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:sword_long', { ...표.sword_long, 공격력: await 공격력('sword_long') }, { 상점: true, 공격력: 14, 구매가: 1200, 판매가: 400 });
      const 액스 = await verify.element('배틀 액스 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:axe_battle', { ...표.axe_battle, 공격력: await 공격력('axe_battle') }, { 상점: false, 공격력: 20, 구매가: null, 판매가: 700 });
      const 숏보우 = await verify.element('숏 보우 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:bow_short', { ...표.bow_short, 공격력: await 공격력('bow_short') }, { 상점: true, 공격력: 9, 구매가: 320, 판매가: 105 });
      const 롱보우 = await verify.element('롱 보우 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:bow_long', { ...표.bow_long, 공격력: await 공격력('bow_long') }, { 상점: true, 공격력: 15, 구매가: 1300, 판매가: 430 });
      const 지팡이 = await verify.element('참나무 지팡이 줄의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:staff_oak', { ...표.staff_oak, 공격력: await 공격력('staff_oak') }, { 상점: true, 공격력: 9, 구매가: 320, 판매가: 105 });
      await verify('무기 줄마다 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 짧은검 && 롱소드 && 액스 && 숏보우 && 롱보우 && 지팡이, true);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('상점 창을 열어 롱 소드 줄을 읽는다', async () => {
      const 창 = await 상점창.열기(game);
      await verify('상점 창의 롱 소드 줄에 아이템 표의 구매가 「1,200 골드」가 보인다', await 창.가격글('sword_long'), '1,200 골드');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    if (궁수 !== undefined) await 캐릭터지우기(admin, 궁수);
    if (마법사 !== undefined) await 캐릭터지우기(admin, 마법사);
  }
});
