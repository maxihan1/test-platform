import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 아이템주기, 장비빼고비우기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 물약쓰기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-439',
  name: '소모품인 빨간 물약은 쓸 수 있다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개를 가진 새 캐릭터가 있다'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 물약 = 0;
  try {
    await test.step('빨간 물약 10개를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa439');
      await 장비빼고비우기(admin, 나);
      await 아이템주기(admin, 나, 'potion_hp_s', { 수량: 10 });
    });

    await test.step('가방에 빨간 물약이 10개 있는지 확인한다', async () => {
      const 그물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      물약 = 그물약?.id ?? 0;
      await verify('가방에 빨간 물약이 10개 있다', 그물약?.quantity, 10, { blocker: true });
    });

    await test.step('빨간 물약을 쓴다', async () => {
      const 응답 = await 물약쓰기응답(admin, 나!, 물약);
      const 코드 = await verify('물약 사용 응답이 200 이다', 응답.status(), 200);
      await verify('소모품인 빨간 물약은 쓸 수 있다', 코드, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
