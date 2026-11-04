import { defineCase, test, verify } from '@platform/kit';

import { 새아이템찾기, type 상점응답 } from './helpers/enhance.helper.js';
import {
  가방읽기,
  GM아이템,
  값읽기,
  상점목록,
  장착,
  캐릭터읽기,
  플레이어만들기,
  해제,
  type 가방,
  type 능력치,
  type 플레이어,
} from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-172',
  name: '상점 목록의 가죽 투구 · 철 투구 · 가죽 갑옷 · 사슬 갑옷 · 가죽 장갑 · 철 장갑 · 가죽 장화 · 철 장화 값이 150 · 600 · 250 · 1000 · 100 · 500 · 100 · 500 이다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다', '방어구를 해제한 1레벨 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 기본방어력 = 0;
  const 방어구번호: Record<string, number> = {};

  await test.step('일회용 계정으로 전사를 만들고 장착한 방어구를 해제한다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    const 지금 = await 가방읽기(request, 나);
    const 낀방어구 = 지금.items.find((i) => i.equippedSlot === 'Armor');
    if (낀방어구 !== undefined) await 해제(request, 나, 낀방어구.id);
  });

  await test.step('방어구를 해제한 1레벨 전사를 확인한다', async () => {
    const 캐릭터 = await 캐릭터읽기(request, 나);
    const 지금 = await 가방읽기(request, 나);
    기본방어력 = 캐릭터.stats.defense;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터가 1레벨이다', 캐릭터.level, 1, { blocker: true });
    await verify('캐릭터가 전사다', 캐릭터.classType, 'Warrior', {
      blocker: true,
    });
    await verify(
      '장착한 갑옷이 없는 상태다',
      지금.items.some((i) => i.equippedSlot === 'Armor'),
      false,
      { blocker: true },
    );
  });

  await test.step('상점 목록에서 방어구 값을 읽는다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    const 값 = (템플릿: string) => 목록.items?.find((i) => i.templateId === 템플릿)?.price;
    const 가죽투구 = await verify('상점 목록의 가죽 투구 값이 150 이다', 값('helm_leather'), 150);
    const 철투구 = await verify('상점 목록의 철 투구 값이 600 이다', 값('helm_iron'), 600);
    const 가죽갑옷 = await verify('상점 목록의 가죽 갑옷 값이 250 이다', 값('armor_leather'), 250);
    const 사슬갑옷 = await verify('상점 목록의 사슬 갑옷 값이 1000 이다', 값('armor_chain'), 1000);
    const 가죽장갑 = await verify('상점 목록의 가죽 장갑 값이 100 이다', 값('gloves_leather'), 100);
    const 철장갑 = await verify('상점 목록의 철 장갑 값이 500 이다', 값('gloves_iron'), 500);
    const 가죽장화 = await verify('상점 목록의 가죽 장화 값이 100 이다', 값('boots_leather'), 100);
    const 철장화 = await verify('상점 목록의 철 장화 값이 500 이다', 값('boots_iron'), 500);
    await verify(
      '상점 목록의 가죽 투구 · 철 투구 · 가죽 갑옷 · 사슬 갑옷 · 가죽 장갑 · 철 장갑 · 가죽 장화 · 철 장화 값이 150 · 600 · 250 · 1000 · 100 · 500 · 100 · 500 이다',
      가죽투구 && 철투구 && 가죽갑옷 && 사슬갑옷 && 가죽장갑 && 철장갑 && 가죽장화 && 철장화,
      true,
    );
  });

  await test.step('상점 목록에서 판금 갑옷을 찾는다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    await verify(
      '상점 목록에 판금 갑옷 「armor_plate」가 없다',
      목록.items?.some((i) => i.templateId === 'armor_plate'),
      false,
    );
  });

  await test.step('GM 으로 방어구를 받아 판매가를 읽는다', async () => {
    const 판매가 = async (템플릿: string) => {
      const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 템플릿));
      const 것 = 새아이템찾기(지금, 템플릿);
      방어구번호[템플릿] = 것?.id ?? 0;
      return 것?.sellPrice;
    };
    const 가죽투구 = await verify('가죽 투구 판매가가 50 이다', await 판매가('helm_leather'), 50);
    const 철투구 = await verify('철 투구 판매가가 200 이다', await 판매가('helm_iron'), 200);
    const 가죽갑옷 = await verify('가죽 갑옷 판매가가 80 이다', await 판매가('armor_leather'), 80);
    const 사슬갑옷 = await verify('사슬 갑옷 판매가가 330 이다', await 판매가('armor_chain'), 330);
    const 판금갑옷 = await verify('판금 갑옷 판매가가 600 이다', await 판매가('armor_plate'), 600);
    const 가죽장갑 = await verify('가죽 장갑 판매가가 30 이다', await 판매가('gloves_leather'), 30);
    const 철장갑 = await verify('철 장갑 판매가가 160 이다', await 판매가('gloves_iron'), 160);
    const 가죽장화 = await verify('가죽 장화 판매가가 30 이다', await 판매가('boots_leather'), 30);
    const 철장화 = await verify('철 장화 판매가가 160 이다', await 판매가('boots_iron'), 160);
    await verify(
      '가죽 투구 · 철 투구 · 가죽 갑옷 · 사슬 갑옷 · 판금 갑옷 · 가죽 장갑 · 철 장갑 · 가죽 장화 · 철 장화 판매가가 50 · 200 · 80 · 330 · 600 · 30 · 160 · 30 · 160 이다',
      가죽투구 && 철투구 && 가죽갑옷 && 사슬갑옷 && 판금갑옷 && 가죽장갑 && 철장갑 && 가죽장화 && 철장화,
      true,
    );
  });

  await test.step('GM 으로 받은 방어구를 하나씩 장착한다', async () => {
    const 오름 = async (템플릿: string) => {
      const 번호 = 방어구번호[템플릿] ?? 0;
      const 값 = await 값읽기<{ stats?: 능력치 }>(await 장착(request, 나, 번호));
      await 해제(request, 나, 번호);
      return 값.stats === undefined ? undefined : 값.stats.defense - 기본방어력;
    };
    const 가죽투구 = await verify('가죽 투구를 장착하면 방어력이 2 오른다', await 오름('helm_leather'), 2);
    const 철투구 = await verify('철 투구를 장착하면 방어력이 4 오른다', await 오름('helm_iron'), 4);
    const 가죽갑옷 = await verify('가죽 갑옷을 장착하면 방어력이 4 오른다', await 오름('armor_leather'), 4);
    const 사슬갑옷 = await verify('사슬 갑옷을 장착하면 방어력이 8 오른다', await 오름('armor_chain'), 8);
    const 판금갑옷 = await verify('판금 갑옷을 장착하면 방어력이 12 오른다', await 오름('armor_plate'), 12);
    const 가죽장갑 = await verify('가죽 장갑을 장착하면 방어력이 1 오른다', await 오름('gloves_leather'), 1);
    const 철장갑 = await verify('철 장갑을 장착하면 방어력이 3 오른다', await 오름('gloves_iron'), 3);
    const 가죽장화 = await verify('가죽 장화를 장착하면 방어력이 1 오른다', await 오름('boots_leather'), 1);
    const 철장화 = await verify('철 장화를 장착하면 방어력이 3 오른다', await 오름('boots_iron'), 3);
    await verify(
      '가죽 투구 · 철 투구 · 가죽 갑옷 · 사슬 갑옷 · 판금 갑옷 · 가죽 장갑 · 철 장갑 · 가죽 장화 · 철 장화를 장착하면 방어력이 2 · 4 · 4 · 8 · 12 · 1 · 3 · 1 · 3 오른다',
      가죽투구 && 철투구 && 가죽갑옷 && 사슬갑옷 && 판금갑옷 && 가죽장갑 && 철장갑 && 가죽장화 && 철장화,
      true,
    );
  });
});
