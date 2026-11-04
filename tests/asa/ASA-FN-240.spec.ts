import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 강화반복, 강화재료받기, 새아이템찾기, type 강화재료 } from './helpers/enhance.helper.js';
import { 가방읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-240',
  name: '강화가 실패하면 강화 수치가 9 그대로다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['+9 짧은 검과 무기 강화 주문서를 가진 캐릭터가 있다'],
  params: z.object({
    시도상한: z.number().int().describe('「Fail」이 나올 때까지 강화를 시도하는 최대 횟수 — 10~30회').default(25),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;
  let 재료: 강화재료 = { 검번호: 0, 주문서번호: 0 };

  await test.step('일회용 계정으로 새 캐릭터를 만들고 +9 짧은 검과 무기 강화 주문서를 받는다', async () => {
    나 = await 플레이어만들기(request);
    재료 = await 강화재료받기(request, 나, params.시도상한);
  });

  await test.step('+9 짧은 검과 무기 강화 주문서를 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 +9 짧은 검이 있다', 새아이템찾기(지금, 'sword_short', 9) !== undefined, true, { blocker: true });
    await verify('가방에 무기 강화 주문서가 있다', 재료.주문서번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('「Fail」이 나올 때까지 +9 짧은 검을 강화한다', async () => {
    const 결과 = await 강화반복(request, 나, 재료, 'Fail', params.시도상한);
    await verify('「Fail」이 시도 상한 안에 나왔다', 결과.결과, 'Fail', {
      blocker: true,
    });
    const 지금 = await 가방읽기(request, 나);
    await verify('강화가 실패하면 강화 수치가 9 그대로다', 지금.items.find((i) => i.id === 결과.아이템번호)?.enhanceLevel, 9);
  });
});
