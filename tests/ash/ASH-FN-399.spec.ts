import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 오류코드, 임의글자, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';
import { 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-399',
  name: '느낌표가 든 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa399');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('느낌표가 든 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `zq${임의글자(3)}!`);
      const 코드 = await verify('느낌표가 든 이름의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('느낌표가 든 이름의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('느낌표가 든 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('빈칸이 든 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `zq ${임의글자(3)}`);
      const 코드 = await verify('빈칸이 든 이름의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('빈칸이 든 이름의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('빈칸이 든 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
