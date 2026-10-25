import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 회원번호, 회원조작 } from './helpers/ops-data.helper.js';
import { 변경기록화면 } from './pages/audit.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-322',
  name: '회원을 잠그면 변경 기록 첫 줄에 메뉴 「회원」 · 내용 「잠금」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 변경 = new 변경기록화면(page);
  let 일회용: 일회용회원;
  let 관리자아이디 = '';
  let 번호 = 0;

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    const 세션 = await 세션읽기(page);
    관리자아이디 = 세션?.loginId ?? '';
    await verify('관리자 계정으로 로그인해 있다', 세션?.role, 'admin', { blocker: true });
    번호 = await 회원번호(page, 일회용.loginId);
    await verify('일회용 회원이 있다', 번호 > 0, true, { blocker: true });
  });

  await test.step('일회용 회원을 잠근 뒤 변경 기록 검색칸에 그 회원 아이디를 적는다', async () => {
    await 회원조작(page, 번호, 'lock');
    await 변경.열기();
    await 변경.검색하기(일회용.loginId);
    await 변경.대상줄(일회용.loginId).first().waitFor();
    const 메뉴 = await verify('변경 기록 첫 줄의 메뉴가 「회원」이다', (await 변경.칸들('메뉴').first().innerText()).trim(), '회원');
    const 내용 = await verify('변경 기록 첫 줄의 내용이 「잠금」이다', (await 변경.칸들('내용').first().innerText()).trim(), '잠금');
    await verify('회원을 잠그면 변경 기록 첫 줄에 메뉴 「회원」 · 내용 「잠금」이 보인다', 메뉴 && 내용, true);
  });

  await test.step('변경 기록 첫 줄의 시각을 읽는다', async () => {
    const 시각 = (await 변경.칸들('시각').first().innerText()).trim();
    await verify('변경 기록 첫 줄의 시각이 초까지 보인다', /\d{1,2}:\d{2}:\d{2}/.test(시각), true);
  });

  await test.step('변경 기록 첫 줄의 운영자를 읽는다', async () => {
    const 운영자 = (await 변경.칸들('운영자').first().innerText()).trim();
    await verify('변경 기록 첫 줄의 운영자가 로그인한 관리자 아이디다', 운영자 === 관리자아이디, true);
  });

  await test.step('일회용 회원을 잠갔다 푼 뒤 변경 기록 검색칸에 그 회원 아이디를 적는다', async () => {
    await 회원조작(page, 번호, 'lock');
    await 회원조작(page, 번호, 'unlock');
    await 변경.열기();
    await 변경.검색하기(일회용.loginId);
    await 변경.줄들.filter({ hasText: '잠금 풀기' }).first().waitFor();
    const 내용들 = (await 변경.칸들('내용').allInnerTexts()).map((글자) => 글자.trim());
    await verify('나중에 한 조작이 변경 기록에서 앞 줄에 보인다', 내용들.slice(0, 2).join(', '), '잠금 풀기, 잠금');
  });
});
