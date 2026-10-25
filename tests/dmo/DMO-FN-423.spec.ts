import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가, 팝업저장응답상태 } from './helpers/notify-flow.helper.js';
import { 환경화면 } from './pages/env.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-423',
  name: '스위치 저장이 실패하면 「홈 공지 팝업」 스위치가 원래 상태로 되돌아간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['관리자 계정으로 로그인해 있고 홈 공지 팝업 저장 응답은 가짜 응답(모킹)으로 실패한다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 환경화면(page);
  const 알림 = new 토스트(page);

  await page.context().route('**/api/admin/settings', (경로) =>
    경로.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  );
  try {
    let 원래켜짐 = false;

    await test.step('관리자 계정으로 로그인하고 환경 화면을 연다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 환경화면.주소);
      await 화면.그려질때까지();
      원래켜짐 = await 화면.홈공지팝업.isChecked();
    });

    await test.step('관리자 로그인과 가짜 응답을 확인한다', async () => {
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
      const 가짜 = await verify('홈 공지 팝업 저장 응답은 가짜 응답(모킹)으로 실패한다', await 팝업저장응답상태(page, 원래켜짐), 500);
      await verify('관리자 계정으로 로그인해 있고 홈 공지 팝업 저장 응답은 가짜 응답(모킹)으로 실패한다', 로그인 && 가짜, true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 누른다', async () => {
      await 화면.홈공지팝업.click();
      await 알림.목록.first().waitFor();
      await verify('스위치 저장이 실패하면 「홈 공지 팝업」 스위치가 원래 상태로 되돌아간다', await 화면.홈공지팝업.isChecked(), 원래켜짐);
    });
  } finally {
    await page.context().unroute('**/api/admin/settings');
  }
});
