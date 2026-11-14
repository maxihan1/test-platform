import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쿠키머리, 일회용회원로그인 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-341',
  name: '비밀번호를 바꾼 뒤에도 바꾸기 전 쿠키로 대시보드를 열면 200 이다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('비밀번호를 바꾼 뒤 바꾸기 전 쿠키로 GET /Account/Dashboard 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 이전쿠키 = await 쿠키머리(request);
    await verify('바꾸기 전 쿠키를 받아 뒀다', 이전쿠키 !== '', true, { blocker: true });
    const 변경 = await 비밀번호바꾸기제출(request, { oldPassword: 회원.비밀번호, newPassword: 'Zz654321y!' });
    await verify('비밀번호 바꾸기 응답 코드가 302 다', 변경.status(), 302, { blocker: true });
    const 응답 = await request.get('/Account/Dashboard', { headers: { cookie: 이전쿠키 }, maxRedirects: 0 });
    await verify('비밀번호를 바꾼 뒤에도 바꾸기 전 쿠키로 대시보드를 열면 200 이다', 응답.status(), expected.응답코드);
  });
});
