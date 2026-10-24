import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 오류, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 이름으로캐릭터만들기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-405',
  name: '이미 있는 이름으로 캐릭터를 만들면 409 「NAME_TAKEN」이다',
  platforms: ['android'],
  precondition: ['다른 계정에 새 캐릭터가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 먼저: 캐릭터 | undefined;
  let 다른: 계정 | undefined;
  try {
    await test.step('다른 계정에 새 캐릭터를 만들고 새 계정을 만든다', async () => {
      먼저 = await 새캐릭터(admin, 'qafn405');
      다른 = await 새계정(admin, 'qafn405');
    });
    await test.step('다른 계정에 새 캐릭터가 있는지 확인한다', async () => {
      await verify('다른 계정의 캐릭터를 읽을 수 있다', (await 캐릭터읽기(admin, 먼저!)).name, 먼저!.이름, { blocker: true });
    });
    await test.step('같은 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 다른!, 먼저!.이름);
      const 코드인가 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름인가 = await verify('오류 코드가 「NAME_TAKEN」이다', (await 오류(응답)).code, 'NAME_TAKEN');
      await verify('이미 있는 이름으로 캐릭터를 만들면 409 「NAME_TAKEN」이다', 코드인가 && 이름인가, true);
    });
  } finally {
    if (다른 !== undefined) await 캐릭터지우기(admin, 다른);
    if (먼저 !== undefined) await 캐릭터지우기(admin, 먼저);
  }
});
