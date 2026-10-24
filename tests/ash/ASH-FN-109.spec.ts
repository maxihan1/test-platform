import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 방어구줄, 상점목록, 장비전부해제 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-109',
  name: '방어구마다 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다',
  platforms: ['android'],
  precondition: ['새 전사가 있다'],
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
    'class:Warrior',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa109', 'Warrior');
    });

    await test.step('새 전사가 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('새 전사가 있다', 읽음.classType, 'Warrior', { blocker: true });
    });

    await test.step('방어구를 하나씩 받아 장착하고 상점 목록과 가방을 읽는다', async () => {
      const 맨몸 = (await 장비전부해제(admin, 나!)).defense;
      const 목록 = await 상점목록(admin, 나!);
      const 가죽투구 = await verify.element('가죽 투구의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:helm_leather', await 방어구줄(admin, 나!, 목록, 'helm_leather', 맨몸), '방어력 2 · 구매가 150 · 판매가 50 · 상점 O');
      const 철투구 = await verify.element('철 투구의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:helm_iron', await 방어구줄(admin, 나!, 목록, 'helm_iron', 맨몸), '방어력 4 · 구매가 600 · 판매가 200 · 상점 O');
      const 가죽갑옷 = await verify.element('가죽 갑옷의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:armor_leather', await 방어구줄(admin, 나!, 목록, 'armor_leather', 맨몸), '방어력 4 · 구매가 250 · 판매가 80 · 상점 O');
      const 사슬갑옷 = await verify.element('사슬 갑옷의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:armor_chain', await 방어구줄(admin, 나!, 목록, 'armor_chain', 맨몸), '방어력 8 · 구매가 1000 · 판매가 330 · 상점 O');
      const 판금갑옷 = await verify.element('판금 갑옷의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:armor_plate', await 방어구줄(admin, 나!, 목록, 'armor_plate', 맨몸), '방어력 12 · 구매가 - · 판매가 600 · 상점 X');
      const 가죽장갑 = await verify.element('가죽 장갑의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:gloves_leather', await 방어구줄(admin, 나!, 목록, 'gloves_leather', 맨몸), '방어력 1 · 구매가 100 · 판매가 30 · 상점 O');
      const 철장갑 = await verify.element('철 장갑의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:gloves_iron', await 방어구줄(admin, 나!, 목록, 'gloves_iron', 맨몸), '방어력 3 · 구매가 500 · 판매가 160 · 상점 O');
      const 가죽장화 = await verify.element('가죽 장화의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:boots_leather', await 방어구줄(admin, 나!, 목록, 'boots_leather', 맨몸), '방어력 1 · 구매가 100 · 판매가 30 · 상점 O');
      const 철장화 = await verify.element('철 장화의 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:boots_iron', await 방어구줄(admin, 나!, 목록, 'boots_iron', 맨몸), '방어력 3 · 구매가 500 · 판매가 160 · 상점 O');
      await verify(
        '방어구마다 방어력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다',
        가죽투구 && 철투구 && 가죽갑옷 && 사슬갑옷 && 판금갑옷 && 가죽장갑 && 철장갑 && 가죽장화 && 철장화,
        true,
      );
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
