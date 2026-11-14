import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';
import { 검증오류글들, 일회용회원로그인, 큰제목들 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-330',
  name: '현재 비밀번호를 비우고 비밀번호 바꾸기를 제출하면 200 으로 같은 화면이 오류와 함께 다시 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('현재 비밀번호를 비우고 비밀번호 바꾸기를 제출한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: '', newPassword: 'abcdef' });
    const html = await 본문글(응답);
    const 코드 = await verify('비밀번호 바꾸기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 화면 = await verify('큰 제목 「Security Settings」가 다시 보인다', 큰제목들(html).includes('Security Settings'), true);
    const 오류 = await verify('오류 문구가 보인다', 검증오류글들(html).length > 0, true);
    await verify('현재 비밀번호를 비우고 비밀번호 바꾸기를 제출하면 200 으로 같은 화면이 오류와 함께 다시 보인다', 코드 && 화면 && 오류, true);
  });
});
