import { defineCase, test, verify } from '@platform/kit';

import { 이동경로, 일회용회원로그인, 화면글들 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출, 웹로그인, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-340',
  name: '비밀번호를 바꾸면 대시보드에 「Password changed successfully!」가 보이고 신규 비밀번호로 웹 로그인된다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원의 비밀번호를 신규 비밀번호로 바꾼다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 신규 = 'Zz654321y!';
    const 변경 = await 비밀번호바꾸기제출(request, { oldPassword: 회원.비밀번호, newPassword: 신규 });
    await verify('비밀번호 바꾸기 응답 코드가 302 다', 변경.status(), 302, { blocker: true });
    const 대시보드 = await 화면글(request, '/Account/Dashboard');
    const 알림 = await verify('「Password changed successfully!」가 보인다', 화면글들(대시보드.html).includes('Password changed successfully!'), true);
    await request.get('/Account/Logout', { maxRedirects: 0 });
    const 다시 = await 웹로그인(request, 회원.아이디, 신규);
    const 코드 = await verify('신규 비밀번호 웹 로그인 응답 코드가 302 다', 다시.status(), 302);
    const 주소 = await verify('신규 비밀번호 웹 로그인 이동 주소가 「/Account/Dashboard」다', 이동경로(다시), '/Account/Dashboard');
    await verify('비밀번호를 바꾸면 대시보드에 「Password changed successfully!」가 보이고 신규 비밀번호로 웹 로그인된다', 알림 && 코드 && 주소, true);
  });
});
