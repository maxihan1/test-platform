import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장착응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-435',
  name: '빨간 물약을 장착하려 하면 409 「NOT_EQUIPPABLE」이다',
  platforms: ['android'],
  precondition: ['빨간 물약을 가진 새 캐릭터가 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 물약 = 0;
  try {
    await test.step('빨간 물약을 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa435');
    });

    await test.step('가방에 빨간 물약이 있는지 확인한다', async () => {
      const 그물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      물약 = 그물약?.id ?? 0;
      await verify('가방에 빨간 물약이 있다', 그물약 !== undefined, true, { blocker: true });
    });

    await test.step('빨간 물약을 장착한다', async () => {
      const 응답 = await 장착응답(admin, 나!, 물약);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「NOT_EQUIPPABLE」이다', await 오류코드(응답), 'NOT_EQUIPPABLE');
      await verify('빨간 물약을 장착하려 하면 409 「NOT_EQUIPPABLE」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
