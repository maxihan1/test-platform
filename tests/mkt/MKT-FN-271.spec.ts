import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-271',
  name: '배너 순서를 바꿔 「저장」하면 홈 배너가 그 순서로 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 순서바꿈 = false;
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

    await test.step('배너 순서를 바꿔 「저장」을 누르고 홈을 연다', async () => {
      await 관리자.열기();
      await 관리자.배너관리탭.click();
      await 관리자.배너줄들.first().waitFor();
      await 관리자.배너줄들.first().dragTo(관리자.배너줄들.nth(2));
      순서바꿈 = true;
      const 저장순서 = await 관리자.배너제목들();
      await 관리자.배너저장.click();
      await 알림.글('저장되었습니다').waitFor();
      await page.goto('/');
      await 관리자.홈배너제목들.first().waitFor();
      await verify('배너 순서를 바꿔 「저장」하면 홈 배너가 그 순서로 보인다', (await 관리자.홈배너제목들.allInnerTexts()).join('|') === 저장순서.join('|'), true);
    });
  } finally {
    await 관리자.열기();
    await 관리자.배너관리탭.click();
    await 관리자.배너줄들.first().waitFor();
    if (순서바꿈) {
      await 관리자.배너줄들.nth(2).dragTo(관리자.배너줄들.first());
      await 관리자.배너저장.click();
      await 알림.글('저장되었습니다').waitFor();
    }
  }
});
