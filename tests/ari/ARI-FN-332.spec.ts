import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자, 본문글 } from './helpers/api.helper.js';
import { 검증오류글들, 이동경로, 일회용회원로그인 } from './helpers/html.helper.js';
import { 비밀번호바꾸기제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-332',
  name: '새 비밀번호 5자로 제출하면 「The password must be at least 6 characters long.」가 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: z.object({
    짧은길이: z.number().int().min(1).max(5).describe('길이 오류가 나는 새 비밀번호 길이 — 1~5자').default(5),
    최소길이: z.number().int().min(6).max(100).describe('바뀌는 새 비밀번호 길이 — 6~100자').default(6),
    최대길이: z.number().int().min(6).max(100).describe('바뀌는 새 비밀번호 길이 — 6~100자').default(100),
    긴길이: z.number().int().min(101).max(200).describe('길이 오류가 나는 새 비밀번호 길이 — 101~200자').default(101),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 길이오류 = 'The password must be at least 6 characters long.';
  let 현재 = '';
  await test.step('새 비밀번호 5자로 비밀번호 바꾸기를 제출한다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    현재 = 회원.비밀번호;
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: 현재, newPassword: 글자(params.짧은길이, 'b') });
    await verify('새 비밀번호 5자로 제출하면 「The password must be at least 6 characters long.」가 보인다', 검증오류글들(await 본문글(응답)).includes(길이오류), true);
  });
  await test.step('새 비밀번호 6자로 비밀번호 바꾸기를 제출한다', async () => {
    const 새 = 글자(params.최소길이, 'c');
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: 현재, newPassword: 새 });
    const 코드 = await verify('비밀번호 바꾸기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
    await verify('새 비밀번호 6자일 때 302 로 대시보드로 이동한다', 코드 && 주소, true);
    현재 = 새;
  });
  await test.step('새 비밀번호 100자로 비밀번호 바꾸기를 제출한다', async () => {
    const 새 = 글자(params.최대길이, 'd');
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: 현재, newPassword: 새 });
    const 코드 = await verify('비밀번호 바꾸기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
    await verify('새 비밀번호 100자일 때 302 로 대시보드로 이동한다', 코드 && 주소, true);
    현재 = 새;
  });
  await test.step('새 비밀번호 101자로 비밀번호 바꾸기를 제출한다', async () => {
    const 응답 = await 비밀번호바꾸기제출(request, { oldPassword: 현재, newPassword: 글자(params.긴길이, 'e') });
    await verify('새 비밀번호 101자일 때 길이 오류 문구 「The password must be at least 6 characters long.」가 보인다', 검증오류글들(await 본문글(응답)).includes(길이오류), true);
  });
});
