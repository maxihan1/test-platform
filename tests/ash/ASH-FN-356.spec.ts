import { defineCase, test, verify } from '@platform/kit';

import { 가입, 새비밀번호, 오류 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 길이맞춘아이디, 무작위숫자, 어드민키상태 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-356',
  name: '3자 아이디로 가입하면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 셋 = 'qa' + 무작위숫자(1);
  const 넷 = 'qa' + 무작위숫자(2);
  const 열여섯 = 길이맞춘아이디('qafn356', 16);
  const 열일곱 = 길이맞춘아이디('qafn356', 17);
  try {
    await test.step('어드민 키로 서버 설정을 읽을 수 있는지 확인한다', async () => {
      await verify('어드민 키로 서버 설정을 읽는다', await 어드민키상태(admin), 200, { blocker: true });
    });
    await test.step('가입 전에 지난 실행이 남긴 계정을 지운다', async () => {
      await 계정지우기(admin, 넷);
    });
    await test.step('3자 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 셋, 새비밀번호());
      const 코드인가 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름인가 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('3자 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드인가 && 이름인가, true);
    });
    await test.step('4자 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 넷, 새비밀번호());
      await verify('4자 아이디로 가입하면 201 이다', 응답.status(), 201);
    });
    await test.step('16자 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 열여섯, 새비밀번호());
      await verify('16자 아이디로 가입하면 201 이다', 응답.status(), 201);
    });
    await test.step('17자 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 열일곱, 새비밀번호());
      const 코드인가 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름인가 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('17자 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드인가 && 이름인가, true);
    });
  } finally {
    for (const 아이디 of [셋, 넷, 열여섯, 열일곱]) await 계정지우기(admin, 아이디);
  }
});
