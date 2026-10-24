import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장비수치읽기, 표읽기 } from './helpers/shop.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-109',
  name: '투구 · 갑옷 · 장갑 · 신발 줄마다 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: [
    'item:helm_leather',
    'item:helm_iron',
    'item:armor_leather',
    'item:armor_chain',
    'item:armor_plate',
    'item:gloves_leather',
    'item:gloves_iron',
    'item:boots_leather',
    'item:boots_iron',
    'npc:상인',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn109');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('상점 목록 · 가방 · 템플릿을 받아 방어구 줄을 견준다', async () => {
      const 번호들 = ['helm_leather', 'helm_iron', 'armor_leather', 'armor_chain', 'armor_plate', 'gloves_leather', 'gloves_iron', 'boots_leather', 'boots_iron'];
      const 표 = await 표읽기(request, admin, 누구!, 번호들);
      const 방어력 = async (번호: string): Promise<number> => 장비수치읽기(request, admin, [누구!], 번호, '방어력');
      const 가죽투구 = await verify.element('가죽 투구 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:helm_leather', { ...표.helm_leather, 방어력: await 방어력('helm_leather') }, { 상점: true, 방어력: 2, 구매가: 150, 판매가: 50 });
      const 철투구 = await verify.element('철 투구 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:helm_iron', { ...표.helm_iron, 방어력: await 방어력('helm_iron') }, { 상점: true, 방어력: 4, 구매가: 600, 판매가: 200 });
      const 가죽갑옷 = await verify.element('가죽 갑옷 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:armor_leather', { ...표.armor_leather, 방어력: await 방어력('armor_leather') }, { 상점: true, 방어력: 4, 구매가: 250, 판매가: 80 });
      const 사슬갑옷 = await verify.element('사슬 갑옷 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:armor_chain', { ...표.armor_chain, 방어력: await 방어력('armor_chain') }, { 상점: true, 방어력: 8, 구매가: 1000, 판매가: 330 });
      const 판금갑옷 = await verify.element('판금 갑옷 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:armor_plate', { ...표.armor_plate, 방어력: await 방어력('armor_plate') }, { 상점: false, 방어력: 12, 구매가: null, 판매가: 600 });
      const 가죽장갑 = await verify.element('가죽 장갑 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:gloves_leather', { ...표.gloves_leather, 방어력: await 방어력('gloves_leather') }, { 상점: true, 방어력: 1, 구매가: 100, 판매가: 30 });
      const 철장갑 = await verify.element('철 장갑 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:gloves_iron', { ...표.gloves_iron, 방어력: await 방어력('gloves_iron') }, { 상점: true, 방어력: 3, 구매가: 500, 판매가: 160 });
      const 가죽장화 = await verify.element('가죽 장화 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:boots_leather', { ...표.boots_leather, 방어력: await 방어력('boots_leather') }, { 상점: true, 방어력: 1, 구매가: 100, 판매가: 30 });
      const 철장화 = await verify.element('철 장화 줄의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:boots_iron', { ...표.boots_iron, 방어력: await 방어력('boots_iron') }, { 상점: true, 방어력: 3, 구매가: 500, 판매가: 160 });
      await verify(
        '투구 · 갑옷 · 장갑 · 신발 줄마다 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다',
        가죽투구 && 철투구 && 가죽갑옷 && 사슬갑옷 && 판금갑옷 && 가죽장갑 && 철장갑 && 가죽장화 && 철장화,
        true,
      );
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('상점 창을 열어 사슬 갑옷 줄을 읽는다', async () => {
      const 창 = await 상점창.열기(game);
      await verify('상점 창의 사슬 갑옷 줄에 아이템 표의 구매가 「1,000 골드」가 보인다', await 창.가격글('armor_chain'), '1,000 골드');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
