import { defineCase, test, verify } from '@platform/kit';

import { 물약만남기기, type 사용응답, 새캐릭터자리, 쓰기, 아이템번호 } from './helpers/admin.helper.js';
import { 개수, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-437',
  name: '마지막 남은 빨간 물약을 쓰면 가방에서 그 스택이 없어진다',
  platforms: ['android'],
  precondition: ['빨간 물약 1개만 가진 새 전사 캐릭터가 있다', '빨간 물약 2개를 가진 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 하나뿐: 캐릭터 | undefined;
  let 둘: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 1개만 가진 새 전사 캐릭터를 만든다', async () => {
      하나뿐 = await 새캐릭터자리(admin, 'qafn437a');
      await 물약만남기기(admin, 하나뿐, 1);
    });
    await test.step('빨간 물약 2개를 가진 새 전사 캐릭터를 만든다', async () => {
      둘 = await 새캐릭터자리(admin, 'qafn437b');
      await 물약만남기기(admin, 둘, 2);
    });
    await test.step('두 캐릭터가 가진 빨간 물약 수를 확인한다', async () => {
      await verify('빨간 물약 1개만 가진 새 전사 캐릭터가 있다', 개수(await 가방읽기(admin, 하나뿐!), 'potion_hp_s'), 1, { blocker: true });
      await verify('빨간 물약 2개를 가진 새 전사 캐릭터가 있다', 개수(await 가방읽기(admin, 둘!), 'potion_hp_s'), 2, { blocker: true });
    });
    await test.step('마지막 빨간 물약을 쓴다', async () => {
      const 나 = 하나뿐!;
      const 응답 = await 본문<사용응답>(await 쓰기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'potion_hp_s')), '아이템 쓰기');
      await verify('마지막 남은 빨간 물약을 쓰면 가방에서 그 스택이 없어진다', 찾기(응답.inventory, 'potion_hp_s') === undefined, true);
    });
    await test.step('빨간 물약 1개를 쓴다', async () => {
      const 나 = 둘!;
      const 응답 = await 본문<사용응답>(await 쓰기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'potion_hp_s')), '아이템 쓰기');
      await verify('빨간 물약 2개 가운데 1개를 쓰면 1개가 남는다', 개수(응답.inventory, 'potion_hp_s'), 1);
    });
  } finally {
    if (하나뿐 !== undefined) await 캐릭터지우기(admin, 하나뿐);
    if (둘 !== undefined) await 캐릭터지우기(admin, 둘);
  }
});
