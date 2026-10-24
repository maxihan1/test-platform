import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 개수, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정비우기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화분포모으기, 강화일꾼만들기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-187',
  name: '목표 +1 ~ +3 강화를 1,000번 하면 성공 100% · 실패 0% · 파괴 0% 에 가깝다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 골드와 무기 강화 주문서를 넉넉히 가지고 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_1-3', 'flow:골드-강화'],
  params: z.object({
    시도: z.number().int().describe('시도 횟수 — 100 이상').default(1000),
    허용오차: z.number().describe('결과마다 허용하는 비율 차이 — 0 과 1 사이').default(0.01),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  const 일꾼들: 캐릭터[] = [];
  const 명수 = Math.min(20, params.시도);
  const 몫 = Math.ceil(params.시도 / 명수);
  try {
    await test.step('새 전사 캐릭터들에게 골드와 무기 강화 주문서를 넉넉히 준다', async () => {
      await 결과고정비우기(admin);
      await 강화일꾼만들기(admin, 'qafn187', 명수, { 주문서: 몫, 골드: 몫 * 1000 }, 일꾼들);
    });
    await test.step('캐릭터마다 골드와 무기 강화 주문서가 넉넉한지 확인한다', async () => {
      const 가방들 = await Promise.all(일꾼들.map((누구) => 가방읽기(admin, 누구)));
      const 모자란수 = 가방들.filter((가방값) => 가방값.gold < 몫 * 1000 || 개수(가방값, 'scroll_weapon') < 몫).length;
      await verify('골드나 무기 강화 주문서가 모자란 캐릭터가 없다', 모자란수, 0, { blocker: true });
    });
    await test.step('+0 ~ +2 롱 소드 강화를 1,000번 한다', async () => {
      const 분포 = await 강화분포모으기(request, admin, 일꾼들, params.시도, (번째) => 번째 % 3);
      const 안 = await verify.rates(
        '성공 · 실패 · 파괴 비율이 기획서 확률의 허용 오차 안이다',
        { 성공: 분포.성공, 실패: 분포.실패, 파괴: 분포.파괴 },
        { 성공: 1, 실패: 0, 파괴: 0 },
        params.허용오차,
      );
      await verify('목표 +1 ~ +3 강화를 1,000번 하면 성공 100% · 실패 0% · 파괴 0% 에 가깝다', 안, true);
    });
  } finally {
    await Promise.all(일꾼들.map((누구) => 캐릭터지우기(admin, 누구)));
  }
});
