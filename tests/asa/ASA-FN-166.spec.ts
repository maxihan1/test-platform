import { defineCase, test, verify } from '@platform/kit';

import { 새아이템찾기, type 상점응답 } from './helpers/enhance.helper.js';
import { 가방읽기, GM아이템, 값읽기, 상점목록, 아이템쓰기, 템플릿찾기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-166',
  name: '상점 목록의 빨간 물약 · 진한 빨간 물약 · 파란 물약 · 무기 강화 주문서 · 방어구 강화 주문서 값이 30 · 120 · 40 · 500 · 400 이다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다', '빨간 물약을 가진 캐릭터가 있다', '진한 빨간 물약을 가진 캐릭터가 있다', '파란 물약을 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 빨간물약번호 = 0;
  let 진한물약번호 = 0;
  let 파란물약번호 = 0;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('아이템 카탈로그의 소모품 · 주문서 구매가를 상점 목록에서 읽는다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    const 값 = (템플릿: string) => 목록.items?.find((i) => i.templateId === 템플릿)?.price;
    const 빨간 = await verify('상점 목록의 빨간 물약 값이 30 이다', 값('potion_hp_s'), 30);
    const 진한 = await verify('상점 목록의 진한 빨간 물약 값이 120 이다', 값('potion_hp_l'), 120);
    const 파란 = await verify('상점 목록의 파란 물약 값이 40 이다', 값('potion_mp_s'), 40);
    const 무기 = await verify('상점 목록의 무기 강화 주문서 값이 500 이다', 값('scroll_weapon'), 500);
    const 방어구 = await verify('상점 목록의 방어구 강화 주문서 값이 400 이다', 값('scroll_armor'), 400);
    await verify(
      '상점 목록의 빨간 물약 · 진한 빨간 물약 · 파란 물약 · 무기 강화 주문서 · 방어구 강화 주문서 값이 30 · 120 · 40 · 500 · 400 이다',
      빨간 && 진한 && 파란 && 무기 && 방어구,
      true,
    );
  });

  await test.step('GM 으로 소모품 · 주문서를 받아 판매가를 읽는다', async () => {
    const 판매가 = async (템플릿: string) => {
      const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 템플릿));
      return 새아이템찾기(지금, 템플릿)?.sellPrice;
    };
    const 빨간 = await verify('빨간 물약 판매가가 10 이다', await 판매가('potion_hp_s'), 10);
    const 진한 = await verify('진한 빨간 물약 판매가가 40 이다', await 판매가('potion_hp_l'), 40);
    const 파란 = await verify('파란 물약 판매가가 12 이다', await 판매가('potion_mp_s'), 12);
    const 무기 = await verify('무기 강화 주문서 판매가가 150 이다', await 판매가('scroll_weapon'), 150);
    const 방어구 = await verify('방어구 강화 주문서 판매가가 120 이다', await 판매가('scroll_armor'), 120);
    await verify(
      '빨간 물약 · 진한 빨간 물약 · 파란 물약 · 무기 강화 주문서 · 방어구 강화 주문서 판매가가 10 · 40 · 12 · 150 · 120 이다',
      빨간 && 진한 && 파란 && 무기 && 방어구,
      true,
    );
  });

  await test.step('빨간 물약 · 진한 빨간 물약 · 파란 물약을 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    빨간물약번호 = 템플릿찾기(지금, 'potion_hp_s')?.id ?? 0;
    진한물약번호 = 템플릿찾기(지금, 'potion_hp_l')?.id ?? 0;
    파란물약번호 = 템플릿찾기(지금, 'potion_mp_s')?.id ?? 0;
    await verify('가방에 빨간 물약이 있다', 빨간물약번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 진한 빨간 물약이 있다', 진한물약번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 파란 물약이 있다', 파란물약번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('빨간 물약을 쓴다', async () => {
    const 값 = await 값읽기<{ healHp?: number }>(await 아이템쓰기(request, 나, 빨간물약번호));
    await verify('빨간 물약을 쓰면 「healHp」가 60 이다', 값.healHp, 60);
  });

  await test.step('진한 빨간 물약을 쓴다', async () => {
    const 값 = await 값읽기<{ healHp?: number }>(await 아이템쓰기(request, 나, 진한물약번호));
    await verify('진한 빨간 물약을 쓰면 「healHp」가 200 이다', 값.healHp, 200);
  });

  await test.step('파란 물약을 쓴다', async () => {
    const 값 = await 값읽기<{ healMp?: number }>(await 아이템쓰기(request, 나, 파란물약번호));
    await verify('파란 물약을 쓰면 「healMp」가 40 이다', 값.healMp, 40);
  });
});
