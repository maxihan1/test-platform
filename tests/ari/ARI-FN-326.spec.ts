import { defineCase, test, verify } from '@platform/kit';

import { 계정번호찾기, 계정상세 } from './helpers/api.helper.js';
import { 일회용회원로그인 } from './helpers/html.helper.js';
import { 일회용회원만들기, 정보수정제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-326',
  name: '정보 수정 폼 Id 를 다른 계정 번호로 변경해 제출하면 그 계정의 이메일이 변경된다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  await test.step('일회용 회원 A 로 로그인해 정보 수정 폼 Id 를 일회용 회원 B 번호로 변경해 제출한다', async () => {
    const 회원B = await 일회용회원만들기(request);
    await verify('일회용 회원 B 가입 응답 코드가 302 다', 회원B.가입상태, 302, { blocker: true });
    const 번호B = await 계정번호찾기(admin, 회원B.아이디);
    await verify('일회용 회원 B 계정 번호를 찾았다', 번호B > 0, true, { blocker: true });
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 A 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 A 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 새이메일 = `changed.${회원B.이메일}`;
    await 정보수정제출(request, { email: 새이메일, id: 번호B });
    await verify('정보 수정 폼 Id 를 다른 계정 번호로 변경해 제출하면 그 계정의 이메일이 변경된다', (await 계정상세(admin, 번호B))?.email ?? '', 새이메일);
  });
});
