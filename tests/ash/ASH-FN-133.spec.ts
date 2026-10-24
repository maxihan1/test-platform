import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-133',
  name: '빨간 물약 5개를 받으면 기존 10개 스택에 합쳐 15개 한 스택이 된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:potion_hp_s', 'zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn133');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('빨간 물약 5개를 받고 가방을 받는다', async () => {
      await 아이템주기(admin, 누구!, 'potion_hp_s', { 수량: 5 });
      const 스택들 = (await 가방받기(request, 누구!)).items.filter((i) => i.templateId === 'potion_hp_s');
      const 한스택 = await verify('빨간 물약 스택이 하나다', 스택들.length, 1);
      const 열다섯 = await verify('빨간 물약 스택의 수량이 15 이다', 스택들[0]?.quantity, 15);
      await verify('빨간 물약 5개를 받으면 기존 10개 스택에 합쳐 15개 한 스택이 된다', 한스택 && 열다섯, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
