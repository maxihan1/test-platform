import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-136',
  name: '995개 스택에 10개를 받으면 999개 스택과 6개 새 스택으로 나뉜다',
  platforms: ['android'],
  precondition: ['빨간 물약 995개 스택을 가진 새 전사 캐릭터가 있다'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 995개 스택을 가진 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn136');
      await 아이템주기(admin, 누구, 'potion_hp_s', { 수량: 985 });
    });
    await test.step('빨간 물약 스택을 확인한다', async () => {
      await verify('빨간 물약 스택이 995개다', 찾기(await 가방받기(request, 누구!), 'potion_hp_s')?.quantity, 995, { blocker: true });
    });
    await test.step('빨간 물약 10개를 받는다', async () => {
      await 아이템주기(admin, 누구!, 'potion_hp_s', { 수량: 10 });
      const 수량들 = (await 가방받기(request, 누구!)).items.filter((i) => i.templateId === 'potion_hp_s').map((i) => i.quantity);
      const 둘 = await verify('빨간 물약 스택이 둘이다', 수량들.length, 2);
      const 큰 = await verify('큰 스택의 수량이 999 이다', Math.max(...수량들), 999);
      const 작은 = await verify('새 스택의 수량이 6 이다', Math.min(...수량들), 6);
      await verify('995개 스택에 10개를 받으면 999개 스택과 6개 새 스택으로 나뉜다', 둘 && 큰 && 작은, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
