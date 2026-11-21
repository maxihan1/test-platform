import { defineCase, test, verify } from '@platform/kit';

import { 계정목록 } from './helpers/admin.helper.js';
import { 가입, 새비밀번호, 새아이디 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-526',
  name: '어드민 계정 목록을 부르면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['일회용 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  const 아이디 = 새아이디();
  let 가입코드 = 0;

  await test.step('일회용 계정을 만든다', async () => {
    가입코드 = (await 가입(request, 아이디, 새비밀번호())).status();
  });

  await test.step('일회용 계정이 만들어졌는지 확인한다', async () => {
    await verify('가입 응답 코드가 201 이다', 가입코드, 201, { blocker: true });
  });

  await test.step('그 아이디를 앞머리로 어드민 계정 목록을 부른다', async () => {
    const 응답 = await 계정목록(admin, 아이디);
    await verify('어드민 계정 목록을 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
