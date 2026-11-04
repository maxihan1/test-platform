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
  tcId: 'ASA-FN-169',
  name: '상점 목록의 짧은 검 · 롱 소드 · 숏 보우 · 롱 보우 · 참나무 지팡이 값이 300 · 1200 · 320 · 1300 · 320 이다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다', '무기를 해제한 1레벨 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 기본공격력 = 0;
  const 무기번호: Record<string, number> = {};

  await test.step('일회용 계정으로 전사를 만들고 장착한 무기를 해제한다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    const 지금 = await 가방읽기(request, 나);
    const 낀무기 = 지금.items.find((i) => i.equippedSlot === 'Weapon');
    if (낀무기 !== undefined) await 해제(request, 나, 낀무기.id);
  });

  await test.step('무기를 해제한 1레벨 전사를 확인한다', async () => {
    const 캐릭터 = await 캐릭터읽기(request, 나);
    const 지금 = await 가방읽기(request, 나);
    기본공격력 = 캐릭터.stats.attack;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터가 1레벨이다', 캐릭터.level, 1, { blocker: true });
    await verify('캐릭터가 전사다', 캐릭터.classType, 'Warrior', {
      blocker: true,
    });
    await verify(
      '장착한 무기가 없는 상태다',
      지금.items.some((i) => i.equippedSlot === 'Weapon'),
      false,
      { blocker: true },
    );
  });

  await test.step('상점 목록에서 무기 값을 읽는다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    const 값 = (템플릿: string) => 목록.items?.find((i) => i.templateId === 템플릿)?.price;
    const 짧은검 = await verify('상점 목록의 짧은 검 값이 300 이다', 값('sword_short'), 300);
    const 롱소드 = await verify('상점 목록의 롱 소드 값이 1200 이다', 값('sword_long'), 1200);
    const 숏보우 = await verify('상점 목록의 숏 보우 값이 320 이다', 값('bow_short'), 320);
    const 롱보우 = await verify('상점 목록의 롱 보우 값이 1300 이다', 값('bow_long'), 1300);
    const 지팡이 = await verify('상점 목록의 참나무 지팡이 값이 320 이다', 값('staff_oak'), 320);
    await verify(
      '상점 목록의 짧은 검 · 롱 소드 · 숏 보우 · 롱 보우 · 참나무 지팡이 값이 300 · 1200 · 320 · 1300 · 320 이다',
      짧은검 && 롱소드 && 숏보우 && 롱보우 && 지팡이,
      true,
    );
  });

  await test.step('상점 목록에서 배틀 액스를 찾는다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    await verify(
      '상점 목록에 배틀 액스 「axe_battle」이 없다',
      목록.items?.some((i) => i.templateId === 'axe_battle'),
      false,
    );
  });

  await test.step('GM 으로 무기를 받아 판매가를 읽는다', async () => {
    const 판매가 = async (템플릿: string) => {
      const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 템플릿));
      const 것 = 새아이템찾기(지금, 템플릿);
      무기번호[템플릿] = 것?.id ?? 0;
      return 것?.sellPrice;
    };
    const 짧은검 = await verify('짧은 검 판매가가 100 이다', await 판매가('sword_short'), 100);
    const 롱소드 = await verify('롱 소드 판매가가 400 이다', await 판매가('sword_long'), 400);
    const 숏보우 = await verify('숏 보우 판매가가 105 이다', await 판매가('bow_short'), 105);
    const 롱보우 = await verify('롱 보우 판매가가 430 이다', await 판매가('bow_long'), 430);
    const 지팡이 = await verify('참나무 지팡이 판매가가 105 이다', await 판매가('staff_oak'), 105);
    const 액스 = await verify('배틀 액스 판매가가 700 이다', await 판매가('axe_battle'), 700);
    await verify(
      '짧은 검 · 롱 소드 · 숏 보우 · 롱 보우 · 참나무 지팡이 · 배틀 액스 판매가가 100 · 400 · 105 · 430 · 105 · 700 이다',
      짧은검 && 롱소드 && 숏보우 && 롱보우 && 지팡이 && 액스,
      true,
    );
  });

  await test.step('GM 으로 받은 무기를 하나씩 장착한다', async () => {
    const 오름 = async (템플릿: string) => {
      const 번호 = 무기번호[템플릿] ?? 0;
      const 값 = await 값읽기<{ stats?: 능력치 }>(await 장착(request, 나, 번호));
      await 해제(request, 나, 번호);
      return 값.stats === undefined ? undefined : 값.stats.attack - 기본공격력;
    };
    const 짧은검 = await verify('짧은 검을 장착하면 공격력이 8 오른다', await 오름('sword_short'), 8);
    const 롱소드 = await verify('롱 소드를 장착하면 공격력이 14 오른다', await 오름('sword_long'), 14);
    const 숏보우 = await verify('숏 보우를 장착하면 공격력이 9 오른다', await 오름('bow_short'), 9);
    const 롱보우 = await verify('롱 보우를 장착하면 공격력이 15 오른다', await 오름('bow_long'), 15);
    const 지팡이 = await verify('참나무 지팡이를 장착하면 공격력이 9 오른다', await 오름('staff_oak'), 9);
    const 액스 = await verify('배틀 액스를 장착하면 공격력이 20 오른다', await 오름('axe_battle'), 20);
    await verify(
      '짧은 검 · 롱 소드 · 숏 보우 · 롱 보우 · 참나무 지팡이 · 배틀 액스를 장착하면 공격력이 8 · 14 · 9 · 15 · 9 · 20 오른다',
      짧은검 && 롱소드 && 숏보우 && 롱보우 && 지팡이 && 액스,
      true,
    );
  });
});
