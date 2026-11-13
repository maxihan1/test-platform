import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';
import { 일회용회원로그인, 화면글들 } from './helpers/html.helper.js';
import { 정보수정제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-523',
  name: '저장 중 DB 오류가 나면 정보 수정 폼에 「Unable to save changes. Try again later.」가 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: z.object({
    오류를낼이메일: z.string().describe('저장 중 DB 오류가 나는 이메일'),
  }),
  expected: null,
  techniques: ['동등 분할'],
  held: '보류 — 저장 중 DB 오류를 낼 길',
});

test(spec, async ({ request, params }) => {
  await test.step('저장 중 DB 오류가 나게 정보 수정을 저장한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 응답 = await 정보수정제출(request, { email: params.오류를낼이메일 });
    await verify('저장 중 DB 오류가 나면 정보 수정 폼에 「Unable to save changes. Try again later.」가 보인다', 화면글들(await 본문글(응답)).includes('Unable to save changes. Try again later.'), true);
  });
});
