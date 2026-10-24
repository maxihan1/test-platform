import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 물약쓰기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-441',
  name: '짧은 검을 쓰려 하면 409 「NOT_USABLE」이다',
  platforms: ['android'],
  precondition: ['짧은 검을 가진 새 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('짧은 검을 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa441');
    });

    await test.step('가방에 짧은 검이 있는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'sword_short');
      검 = 그검?.id ?? 0;
      await verify('가방에 짧은 검이 있다', 그검 !== undefined, true, { blocker: true });
    });

    await test.step('짧은 검을 쓴다', async () => {
      const 응답 = await 물약쓰기응답(admin, 나!, 검);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「NOT_USABLE」이다', await 오류코드(응답), 'NOT_USABLE');
      await verify('짧은 검을 쓰려 하면 409 「NOT_USABLE」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
