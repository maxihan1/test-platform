import { defineCase, test, verify } from '@platform/kit';

import { 이동경로, 일회용회원로그인, 화면글들 } from './helpers/html.helper.js';
import { 정보수정제출, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-323',
  name: '정보 수정에서 이메일을 저장하면 대시보드로 이동해 「Profile updated successfully!」가 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원으로 정보 수정에서 신규 이메일을 저장한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 저장 = await 정보수정제출(request, { email: `new.${회원.이메일}` });
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(저장), '/Account/Dashboard');
    const 대시보드 = await 화면글(request, '/Account/Dashboard');
    const 알림 = await verify('「Profile updated successfully!」가 보인다', 화면글들(대시보드.html).includes('Profile updated successfully!'), true);
    await verify('정보 수정에서 이메일을 저장하면 대시보드로 이동해 「Profile updated successfully!」가 보인다', 주소 && 알림, true);
  });
});
