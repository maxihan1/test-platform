import { defineCase, test, verify } from '@platform/kit';

import { 본문글 } from './helpers/api.helper.js';
import { 검증오류글들, 일회용회원로그인 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-339',
  name: '현재 비밀번호를 틀리게 넣어 제출하면 「Current password is incorrect.」가 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('현재 비밀번호를 틀리게 넣어 비밀번호 바꾸기를 제출한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: `${회원.비밀번호}x`, newPassword: 'abcdef' });
    await verify('현재 비밀번호를 틀리게 넣어 제출하면 「Current password is incorrect.」가 보인다', 검증오류글들(await 본문글(응답)).includes('Current password is incorrect.'), true);
  });
});
