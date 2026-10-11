import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-266',
  name: '잠긴 회원 줄의 「잠금 해제」를 누르면 그 회원 상태가 잠금에서 풀린다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
  });

  await test.step('잠긴 회원 줄의 「잠금 해제」를 누른다', async () => {
    await 관리자.열기();
    await 관리자.회원관리탭.click();
    await 관리자.회원표.waitFor();
    await 관리자.열머리('상태').getByRole('button').click();
    const 대상 = (await 관리자.잠긴회원줄.first().getByRole('cell').first().innerText()).trim();
    await 관리자.잠긴회원줄.first().getByRole('button', { name: '잠금 해제' }).click();
    await 알림.글('잠금이 해제되었습니다').waitFor();
    await verify('잠긴 회원 줄의 「잠금 해제」를 누르면 그 회원 상태가 잠금에서 풀린다', (await 관리자.회원줄(대상).first().innerText()).includes('정상'), true);
  });
});
