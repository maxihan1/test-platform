import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import { 세션읽기, 회원상태읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';
import type { 일회용회원 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'DMO-UI-142',
  name: '회원 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = new 회원관리화면(page);
  let 일회용: 일회용회원;

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 정상 회원 줄이 보임을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
    await 회원.검색하기(일회용.loginId);
    await verify('정상 회원 줄이 보인다', await 회원.상태칸(일회용.loginId).innerText(), '정상', { blocker: true });
  });

  await test.step('정상 회원 줄의 「비밀번호 바꾸기」를 누른다', async () => {
    await 회원.줄버튼(일회용.loginId, '비밀번호 바꾸기').click();
    await 회원.바꾸기.waitFor();
    await verify('회원 관리 화면에서 「비밀번호 바꾸기」를 누르면 「새 비밀번호」 칸이 있는 창이 뜬다', await 회원.새비밀번호.isVisible(), true);
  });

  await test.step('비밀번호 창의 「닫기」를 누른다', async () => {
    await 회원.창닫기.click();
    await 회원.틀.확인창.waitFor({ state: 'detached' });
    await verify('비밀번호 창에서 「닫기」를 누르면 창이 닫힌다', await 회원.틀.확인창.isVisible(), false);
  });

  await test.step('정상 회원 줄의 「탈퇴 처리」를 누른다', async () => {
    await 회원.줄버튼(일회용.loginId, '탈퇴 처리').click();
    await 회원.틀.창버튼('탈퇴 처리').waitFor();
    await verify('회원 관리 화면에서 「탈퇴 처리」를 누르면 확인 창이 뜬다', await 회원.틀.확인창.isVisible(), true);
  });

  await test.step('탈퇴 확인 창의 「닫기」를 누른다', async () => {
    await 회원.창닫기.click();
    await 회원.틀.확인창.waitFor({ state: 'detached' });
    const 창닫힘 = await verify('탈퇴 확인 창이 닫힌다', await 회원.틀.확인창.isVisible(), false);
    const 상태그대로 = await verify('그 회원 상태가 「정상」 그대로다', await 회원상태읽기(page, 일회용.loginId), 'active');
    await verify('탈퇴 확인 창에서 「닫기」를 누르면 창이 닫히고 그 회원 상태가 그대로다', 창닫힘 && 상태그대로, true);
  });
});
