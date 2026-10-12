import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-282',
  name: '「홈 공지 팝업」 스위치를 바꾸면 토스트 「저장되었습니다」가 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = 관리자값(params);
  const 화면 = new 관리자화면(page);
  const 토스 = new 토스트(page);
  let 원래: boolean | undefined;

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자.loginId, 관리자.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
  });

  try {
    await test.step('관리자 화면을 준비한다', async () => {
      원래 = ((await (await page.request.get('/api/settings')).json()) as { noticePopup: boolean }).noticePopup;
      await 화면.열기();
      await 화면.공지팝업스위치.waitFor();
    });

    await test.step('관리자 화면이 열렸는지 확인한다', async () => {
      await verify('「홈 공지 팝업」 스위치가 보인다', await 화면.공지팝업스위치.isVisible(), true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 바꾼다', async () => {
      await 화면.공지팝업스위치.click();
      await 토스.글('저장되었습니다').first().waitFor();
      await verify('「홈 공지 팝업」 스위치를 바꾸면 토스트 「저장되었습니다」가 보인다', await 토스.글('저장되었습니다').first().isVisible(), true);
    });
  } finally {
    if (원래 !== undefined) await page.request.put('/api/admin/settings', { data: { noticePopup: 원래 } });
  }
});
