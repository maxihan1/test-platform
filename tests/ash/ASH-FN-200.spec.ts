import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 강화확률되돌리기, 강화확률바꾸기, 결과고정비우기, 골드주기, 새캐릭터, 설정읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-200',
  name: '목표 +7 성공 확률을 100% 로 바꾸고 5번 강화하면 5번 다 성공한다',
  platforms: ['android'],
  precondition: [
    '새 전사 캐릭터로 게임에 들어와 +6 롱 소드 5자루를 가지고 있고 목표 +7 성공 확률이 100% 다',
    '새 전사 캐릭터로 게임에 들어와 +6 롱 소드를 가지고 있고 목표 +7 성공 확률이 0% 다',
  ],
  techniques: ['경계값 분석'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_7', 'npc:강화사', 'flow:골드-강화'],
  params: z.object({
    횟수: z.number().int().describe('강화할 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  const 칼들: number[] = [];
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn200');
      await 골드주기(admin, 누구, 100_000);
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: params.횟수 * 2 });
      for (let 번 = 0; 번 < params.횟수; 번 += 1) await 아이템주기(admin, 누구, 'sword_long', { 강화: 6 });
      const 가방값 = await 가방읽기(admin, 누구);
      칼들.push(...가방값.items.filter((i) => i.templateId === 'sword_long').map((i) => i.id).sort((a, b) => a - b));
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('목표 +7 성공 확률을 0% 로 바꾼다', async () => {
      await 결과고정비우기(admin);
      await 강화확률바꾸기(admin, [{ targetLevel: 7, success: 0, fail: 1, destroy: 0 }]);
    });
    await test.step('+6 롱 소드 1자루와 성공 확률 0% 를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('가방에 +6 롱 소드가 있다', 가방값.items.find((i) => i.id === 칼들[0])?.enhanceLevel, 6, { blocker: true });
      const 확률 = (await 설정읽기(admin)).enhance.rates.find((r) => r.targetLevel === 7);
      await verify('목표 +7 성공 확률이 0% 이다', 확률?.success, 0, { blocker: true });
    });
    await test.step('강화 창에서 +6 롱 소드를 5번 강화한다', async () => {
      const 창 = await 강화창.열기(game);
      const 결과들: string[] = [];
      for (let 번 = 0; 번 < params.횟수; 번 += 1) {
        await 창.장비고르기(칼들[0]!);
        결과들.push(await 창.강화하기());
      }
      const 화면 = await verify('강화 창에 성공이 한 번도 보이지 않는다', 결과들.filter((글) => 글.includes('성공')).length, 0);
      const 가방값 = await 가방읽기(admin, 누구!);
      const 서버 = await verify('가방의 롱 소드가 +6 그대로다', 가방값.items.find((i) => i.id === 칼들[0])?.enhanceLevel, 6);
      await verify('목표 +7 성공 확률을 0% 로 바꾸고 5번 강화하면 한 번도 성공하지 않는다', 화면 && 서버, true);
      await 창.닫기누르기();
    });

    await test.step('목표 +7 성공 확률을 100% 로 바꾼다', async () => {
      await 결과고정비우기(admin);
      await 강화확률바꾸기(admin, [{ targetLevel: 7, success: 1, fail: 0, destroy: 0 }]);
    });
    await test.step('+6 롱 소드 5자루와 성공 확률 100% 를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      const 맞는칼 = 칼들.slice(0, params.횟수).filter((번호) => 가방값.items.find((i) => i.id === 번호)?.enhanceLevel === 6).length;
      await verify('가방에 +6 롱 소드가 횟수만큼 있다', 맞는칼, params.횟수, { blocker: true });
      const 확률 = (await 설정읽기(admin)).enhance.rates.find((r) => r.targetLevel === 7);
      await verify('목표 +7 성공 확률이 100% 이다', 확률?.success, 1, { blocker: true });
    });
    await test.step('강화 창에서 +6 롱 소드 5자루를 하나씩 강화한다', async () => {
      const 창 = await 강화창.열기(game);
      const 결과들: string[] = [];
      for (const 번호 of 칼들.slice(0, params.횟수)) {
        await 창.장비고르기(번호);
        결과들.push(await 창.강화하기());
      }
      const 화면 = await verify('강화 창에 성공이 횟수만큼 보인다', 결과들.filter((글) => 글.includes('성공')).length, params.횟수);
      const 가방값 = await 가방읽기(admin, 누구!);
      const 서버 = await verify('가방의 +7 롱 소드가 횟수만큼 있다', 가방값.items.filter((i) => i.templateId === 'sword_long' && i.enhanceLevel === 7).length, params.횟수);
      await verify('목표 +7 성공 확률을 100% 로 바꾸고 5번 강화하면 5번 다 성공한다', 화면 && 서버, true);
      await 창.닫기누르기();
    });
  } finally {
    await 결과고정비우기(admin);
    await 강화확률되돌리기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
