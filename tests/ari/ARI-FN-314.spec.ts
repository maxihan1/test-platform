import { defineCase, test, verify } from '@platform/kit';

import { 빨간알림글들 } from './helpers/html.helper.js';
import { 본문글 } from './helpers/api.helper.js';
import { 웹로그인, 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-314',
  name: '틀린 비밀번호로 웹 로그인하면 화면에 빨간 오류 알림이 보이지 않는다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원 아이디와 틀린 비밀번호로 웹 로그인한 화면을 읽는다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    const 응답 = await 웹로그인(request, 회원.아이디, `${회원.비밀번호}x`);
    await verify('틀린 비밀번호 웹 로그인 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    await verify('틀린 비밀번호로 웹 로그인하면 화면에 빨간 오류 알림이 보이지 않는다', 빨간알림글들(await 본문글(응답)).join(', '), '');
  });
});
