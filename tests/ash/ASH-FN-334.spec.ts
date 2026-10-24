import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 머리, 본문, 새계정, type 원장줄, 인증머리, type 캐릭터, 캐릭터만들기 } from './helpers/api.helper.js';
import { 골드주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-334',
  name: 'X-Character-Id 로 둘째 캐릭터를 주면 원장이 둘째 캐릭터 것으로 온다',
  platforms: ['android'],
  precondition: ['한 계정에 새 캐릭터 둘이 있다'],
  elements: ['flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정값: 계정 | undefined;
  let 둘째: 캐릭터 | undefined;
  try {
    await test.step('한 계정에 새 캐릭터 둘을 만든다', async () => {
      계정값 = await 새계정(admin, 'qafn334');
      await 캐릭터만들기(admin, 계정값);
      둘째 = await 캐릭터만들기(admin, 계정값);
      await 골드주기(admin, 둘째, 1300);
    });
    await test.step('한 계정에 새 캐릭터 둘이 있는지 확인한다', async () => {
      const 목록 = await 본문<unknown[]>(await request.get('/characters', { headers: 인증머리(계정값!) }), '캐릭터 목록');
      await verify('한 계정에 새 캐릭터 둘이 있다', 목록.length, 2, { blocker: true });
    });
    await test.step('X-Character-Id 를 둘째 캐릭터로 주고 골드 원장을 받는다', async () => {
      const 원장 = await 본문<원장줄[]>(await request.get('/currency/ledger?limit=50', { headers: 머리(둘째!) }), '골드 원장');
      await verify('X-Character-Id 로 둘째 캐릭터를 주면 원장이 둘째 캐릭터 것으로 온다', 원장[0]?.balanceAfter, 1300);
    });
  } finally {
    if (계정값 !== undefined) await 캐릭터지우기(admin, 계정값);
  }
});
