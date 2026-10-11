import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-273',
  name: '「홈 공지 팝업」 스위치를 끄면 홈에 공지 팝업이 뜨지 않는다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 원래공지 = true;
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
    });

    await test.step('공지 팝업 원래 설정을 읽어 둔다', async () => {
      원래공지 = ((await (await page.request.get('/api/settings')).json()) as { noticePopup: boolean }).noticePopup;
    });

    await test.step('「홈 공지 팝업」 스위치를 끄고 홈을 연다', async () => {
      await 방해막기(page, { 공지팝업: false });
      await 관리자.열기();
      await 관리자.공지팝업스위치.uncheck();
      await 알림.글('저장되었습니다').waitFor();
      await page.goto('/');
      await 관리자.홈배너제목들.first().waitFor();
      await verify('「홈 공지 팝업」 스위치를 끄면 홈에 공지 팝업이 뜨지 않는다', await 관리자.홈공지창.isVisible(), false);
    });
  } finally {
    await page.request.put('/api/admin/settings', { data: { noticePopup: 원래공지 } });
  }
});
