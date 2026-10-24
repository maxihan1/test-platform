import { defineCase, test, verify } from '@platform/kit';

import { 가입, 새비밀번호, 새아이디, 오류 } from './helpers/api.helper.js';
import { 설정읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-348',
  name: '필드 형식이 틀린 가입을 보내면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  await test.step('어드민 키가 있는지 확인한다', async () => {
    const 설정 = await 설정읽기(admin);
    await verify('어드민 키가 있다', typeof 설정.enhance, 'object', { blocker: true });
  });
  await test.step('아이디를 2자로 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디('q').slice(0, 2), 새비밀번호());
    const 본문값 = await 오류(응답);
    const 상태 = await verify('응답 코드가 400 이다', 응답.status(), 400);
    const 코드 = await verify('오류 코드가 「VALIDATION_FAILED」이다', 본문값.code, 'VALIDATION_FAILED');
    await verify('필드 형식이 틀린 가입을 보내면 400 「VALIDATION_FAILED」다', 상태 && 코드, true);
  });
});
