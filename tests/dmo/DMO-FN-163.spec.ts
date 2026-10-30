import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가, 배너노출바꾸기, 홈공지팝업바꾸기 } from './helpers/notify-flow.helper.js';
import { 환경화면 } from './pages/env.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-163',
  name: '환경 스위치를 끄면 다시 연 환경 화면에서도 꺼져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    배너: z.string().describe('PC 에서 끌 배너 제목 — 환경 화면에 보이는 배너 가운데 하나').default('책 읽는 계절'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 환경화면(page);
  const 알림 = new 토스트(page);
  const 휴대폰 = (page.viewportSize()?.width ?? 1280) < 768;
  const 스위치 = 휴대폰 ? 화면.홈공지팝업 : 화면.배너(params.배너);
  const 켜두기 = () => (휴대폰 ? 홈공지팝업바꾸기(page, true) : 배너노출바꾸기(page, params.배너, true));

  try {
    await test.step('관리자 계정으로 로그인하고 환경 화면을 연다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 환경화면.주소);
      await 켜두기();
      await 화면.열기();
    });

    await test.step('관리자 로그인과 켜진 스위치를 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
      await verify('끌 스위치가 켜져 있다', await 스위치.isChecked(), true, { blocker: true });
    });

    await test.step('환경 스위치 하나를 끈 뒤 환경 화면을 다시 연다', async () => {
      await 스위치.uncheck();
      await 알림.목록.first().waitFor();
      await 화면.열기();
      await verify('환경 스위치를 끄면 다시 연 환경 화면에서도 꺼져 있다', await 스위치.isChecked(), false);
    });
  } finally {
    await 켜두기();
  }
});
