import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-134',
  name: '994개 스택에 5개를 받으면 999개 한 스택이 된다',
  platforms: ['android'],
  precondition: ['빨간 물약 994개 스택을 가진 새 전사 캐릭터가 있다', '빨간 물약 999개 스택을 가진 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 아래: 캐릭터 | undefined;
  let 가득: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 994개 스택과 999개 스택을 가진 새 전사 캐릭터를 만든다', async () => {
      아래 = await 새캐릭터(admin, 'qafn134');
      가득 = await 새캐릭터(admin, 'qafn134');
      await 아이템주기(admin, 아래, 'potion_hp_s', { 수량: 984 });
      await 아이템주기(admin, 가득, 'potion_hp_s', { 수량: 989 });
    });
    await test.step('두 캐릭터의 빨간 물약 스택을 확인한다', async () => {
      await verify('첫째 캐릭터의 빨간 물약 스택이 994개다', 찾기(await 가방받기(request, 아래!), 'potion_hp_s')?.quantity, 994, { blocker: true });
      await verify('둘째 캐릭터의 빨간 물약 스택이 999개다', 찾기(await 가방받기(request, 가득!), 'potion_hp_s')?.quantity, 999, { blocker: true });
    });
    await test.step('빨간 물약 5개를 받는다', async () => {
      await 아이템주기(admin, 아래!, 'potion_hp_s', { 수량: 5 });
      const 스택들 = (await 가방받기(request, 아래!)).items.filter((i) => i.templateId === 'potion_hp_s');
      const 한스택 = await verify('첫째 캐릭터의 빨간 물약 스택이 하나다', 스택들.length, 1);
      const 천개 = await verify('첫째 캐릭터의 빨간 물약 스택의 수량이 999 이다', 스택들[0]?.quantity, 999);
      await verify('994개 스택에 5개를 받으면 999개 한 스택이 된다', 한스택 && 천개, true);
    });
    await test.step('빨간 물약 1개를 받는다', async () => {
      const 원래번호 = 찾기(await 가방받기(request, 가득!), 'potion_hp_s')?.id;
      await 아이템주기(admin, 가득!, 'potion_hp_s', { 수량: 1 });
      const 스택들 = (await 가방받기(request, 가득!)).items.filter((i) => i.templateId === 'potion_hp_s');
      const 원래 = await verify('둘째 캐릭터의 원래 스택의 수량이 999 이다', 스택들.find((i) => i.id === 원래번호)?.quantity, 999);
      const 넘지않음 = await verify('둘째 캐릭터의 빨간 물약 스택이 모두 999개 이하다', 스택들.every((i) => i.quantity <= 999), true);
      await verify('999개 스택에 1개를 받아도 그 스택은 999개를 넘지 않는다', 원래 && 넘지않음, true);
    });
  } finally {
    if (아래 !== undefined) await 캐릭터지우기(admin, 아래);
    if (가득 !== undefined) await 캐릭터지우기(admin, 가득);
  }
});
