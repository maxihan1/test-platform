import type { APIResponse } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 가입, 갱신, 글칸, 로그인, 본문, 새비밀번호, 새아이디, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-025',
  name: '이미 쓴 리프레시 토큰으로 다시 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다',
  apiDoc: 1,
  precondition: ['한 번 갱신해 쓴 리프레시 토큰이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();
  let 가입응답!: APIResponse;
  let 로그인응답!: APIResponse;
  let 첫갱신응답!: APIResponse;

  await test.step('새 아이디로 가입한다', async () => {
    가입응답 = await 가입(request, 아이디, 비밀번호);
  });

  await test.step('가입 결과를 확인한다', async () => {
    await verify('새 아이디 가입 응답에 「accountId」가 있다', (await 본문(가입응답)).accountId !== undefined, true, { blocker: true });
  });

  await test.step('가입한 아이디로 로그인한다', async () => {
    로그인응답 = await 로그인(request, 아이디, 비밀번호);
  });

  await test.step('로그인 결과를 확인한다', async () => {
    await verify('로그인 응답에 「refreshToken」이 있다', (await 글칸(로그인응답, 'refreshToken')) !== '', true, { blocker: true });
  });

  await test.step('리프레시 토큰으로 한 번 갱신한다', async () => {
    첫갱신응답 = await 갱신(request, await 글칸(로그인응답, 'refreshToken'));
  });

  await test.step('첫 갱신 결과를 확인한다', async () => {
    await verify('첫 갱신 응답에 새 「refreshToken」이 있다', (await 글칸(첫갱신응답, 'refreshToken')) !== '', true, { blocker: true });
  });

  await test.step('이미 쓴 리프레시 토큰으로 다시 갱신한다', async () => {
    const 응답 = await 갱신(request, await 글칸(로그인응답, 'refreshToken'));
    const 코드 = await verify('이미 쓴 토큰 갱신 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('이미 쓴 토큰 갱신 오류 코드가 「INVALID_REFRESH_TOKEN」이다', await 오류코드(응답), 'INVALID_REFRESH_TOKEN');
    await verify('이미 쓴 리프레시 토큰으로 다시 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다', 코드 && 오류, true);
  });
});
