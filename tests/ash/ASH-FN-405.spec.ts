import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 새캐릭터, 오류코드, type 계정, type 캐릭터 } from './helpers/game-state.helper.js';
import { 이름쓰는수, 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-405',
  name: '이미 있는 이름으로 캐릭터를 만들면 409 「NAME_TAKEN」이다',
  platforms: ['android'],
  precondition: ['다른 계정이 쓰는 캐릭터 이름이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 남: 캐릭터 | undefined;
  let 나: 계정 | undefined;
  try {
    await test.step('다른 계정이 쓰는 캐릭터 이름을 만든다', async () => {
      남 = await 새캐릭터(admin, 'zqa405');
      나 = await 새계정(admin, 'zqa405');
    });

    await test.step('다른 계정이 그 이름을 쓰고 있는지 확인한다', async () => {
      await verify('다른 계정이 쓰는 캐릭터 이름이 있다', await 이름쓰는수(admin, 남!.이름), 1, { blocker: true });
    });

    await test.step('같은 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, 남!.이름);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「NAME_TAKEN」이다', await 오류코드(응답), 'NAME_TAKEN');
      await verify('이미 있는 이름으로 캐릭터를 만들면 409 「NAME_TAKEN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
    if (남 !== undefined) await 계정지우기(admin, 남);
  }
});
