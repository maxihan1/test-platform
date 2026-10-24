import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-137',
  name: '989개 스택에 10개를 받아 999개가 되면 새 칸을 쓰지 않는다',
  platforms: ['android'],
  precondition: ['빨간 물약 989개 스택을 가진 새 전사 캐릭터가 있다', '빨간 물약 990개 스택을 가진 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 아래: 캐릭터 | undefined;
  let 위: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 989개 스택과 990개 스택을 가진 새 전사 캐릭터를 만든다', async () => {
      아래 = await 새캐릭터(admin, 'qafn137');
      위 = await 새캐릭터(admin, 'qafn137');
      await 아이템주기(admin, 아래, 'potion_hp_s', { 수량: 979 });
      await 아이템주기(admin, 위, 'potion_hp_s', { 수량: 980 });
    });
    await test.step('두 캐릭터의 빨간 물약 스택을 확인한다', async () => {
      await verify('첫째 캐릭터의 빨간 물약 스택이 989개다', 찾기(await 가방받기(request, 아래!), 'potion_hp_s')?.quantity, 989, { blocker: true });
      await verify('둘째 캐릭터의 빨간 물약 스택이 990개다', 찾기(await 가방받기(request, 위!), 'potion_hp_s')?.quantity, 990, { blocker: true });
    });
    await test.step('빨간 물약 10개를 받는다', async () => {
      const 아래전 = (await 가방받기(request, 아래!)).used;
      await 아이템주기(admin, 아래!, 'potion_hp_s', { 수량: 10 });
      const 아래후 = (await 가방받기(request, 아래!)).used;
      await verify('989개 스택에 10개를 받아 999개가 되면 새 칸을 쓰지 않는다', 아래후 - 아래전, 0);
      const 위전 = (await 가방받기(request, 위!)).used;
      await 아이템주기(admin, 위!, 'potion_hp_s', { 수량: 10 });
      const 위후 = (await 가방받기(request, 위!)).used;
      await verify('990개 스택에 10개를 받아 1,000개가 되면 새 칸을 하나 쓴다', 위후 - 위전, 1);
    });
  } finally {
    if (아래 !== undefined) await 캐릭터지우기(admin, 아래);
    if (위 !== undefined) await 캐릭터지우기(admin, 위);
  }
});
