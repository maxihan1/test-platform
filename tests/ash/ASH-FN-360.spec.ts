import { defineCase, test, verify } from '@platform/kit';

import { 가입만, 계정지우기, 오류코드, 임의글자 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-360',
  name: '대문자가 든 아이디로 가입하면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 만든계정: string[] = [];
  let 대문자 = '';
  let 하이픈 = '';
  try {
    await test.step('대문자가 든 아이디와 하이픈이 든 아이디를 짓는다', async () => {
      대문자 = `zqa360X${임의글자(6)}`;
      하이픈 = `zqa360-${임의글자(6)}`;
    });

    await test.step('지은 아이디가 가입돼 있지 않은지 확인한다', async () => {
      const 이미: string[] = [];
      for (const 아이디 of [대문자, 하이픈]) {
        if ((await 가입된수(admin, 아이디)) > 0) 이미.push(아이디);
      }
      await verify('가입하지 않은 아이디가 있다', 이미.join(', '), '', { blocker: true });
    });

    await test.step('대문자가 든 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 대문자, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(대문자);
      const 코드 = await verify('대문자가 든 아이디의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('대문자가 든 아이디의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('대문자가 든 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('하이픈이 든 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 하이픈, 임의글자(12));
      if (응답.status() === 201) 만든계정.push(하이픈);
      const 코드 = await verify('하이픈이 든 아이디의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('하이픈이 든 아이디의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('하이픈이 든 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    for (const 계정 of 만든계정) await 계정지우기(admin, 계정);
  }
});
