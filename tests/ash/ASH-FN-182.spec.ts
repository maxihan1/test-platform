import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  가방,
  강화하기,
  계정지우기,
  결과고정,
  고정목록,
  고정비우기,
  바꾸기,
  새아이템주기,
  새캐릭터,
  오류코드,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-182',
  name: '+9 롱 소드를 성공 고정으로 강화하면 +10 이 된다',
  platforms: ['android'],
  precondition: [
    '+9 롱 소드와 무기 강화 주문서를 가진 새 캐릭터가 있고 강화 결과가 성공으로 고정돼 있다',
    '+10 롱 소드와 무기 강화 주문서를 가진 새 캐릭터가 있다',
  ],
  techniques: ['경계값 분석'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_10'],
  params: z.object({
    강화단계: z.number().int().min(0).max(9).describe('강화 전 롱 소드의 강화 단계 — 0 이상 9 이하 (강화하면 한 단계 오른다)').default(9),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 단계검 = 0;
  let 최대검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+9 롱 소드 · +10 롱 소드 · 무기 강화 주문서를 가진 새 캐릭터를 만들고 강화 결과를 성공으로 고정한다', async () => {
      나 = await 새캐릭터(admin, 'zqa182');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 10000 });
      단계검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: params.강화단계 })).id;
      최대검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 10 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
      await 결과고정(admin, { enhance: ['Success'] });
    });

    await test.step('가방에 롱 소드 두 자루와 주문서가 있고 강화 결과가 성공으로 고정됐는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 +9 롱 소드가 있다', 지금.items.find((x) => x.id === 단계검)?.enhanceLevel, params.강화단계, { blocker: true });
      await verify('가방에 +10 롱 소드가 있다', 지금.items.find((x) => x.id === 최대검)?.enhanceLevel, 10, { blocker: true });
      await verify('강화 결과가 성공으로 고정돼 있다', (await 고정목록(admin)).enhance.join(', '), 'Success', { blocker: true });
    });

    await test.step('+9 롱 소드를 강화한다', async () => {
      const 코드 = await verify('강화 응답 코드가 200 이다', (await 강화하기(admin, 나!, 단계검, 주문서)).status(), 200);
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 단계검);
      const 단계 = await verify('롱 소드가 한 단계 오른다', 그검?.enhanceLevel, params.강화단계 + 1);
      await verify('+9 롱 소드를 성공 고정으로 강화하면 +10 이 된다', 코드 && 단계, true);
    });

    await test.step('+10 롱 소드를 강화한다', async () => {
      const 응답 = await 강화하기(admin, 나!, 최대검, 주문서);
      const 코드 = await verify('+10 롱 소드를 강화한 응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('+10 롱 소드를 강화한 오류 코드가 「MAX_ENHANCE」다', await 오류코드(응답), 'MAX_ENHANCE');
      await verify('+10 롱 소드를 강화하려 하면 409 「MAX_ENHANCE」다', 코드 && 이름, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
