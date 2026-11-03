import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-004',
  name: '운영 화면 왼쪽 메뉴에 「대시보드」 · 「회원」 · 「주문」 · 「상품」 · 「문의」 · 「게시판」 · 「알림 · 쿠폰」 · 「시험 데이터」 · 「변경 기록」 · 「환경」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 틀 = new 운영틀(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
  });

  await test.step('/ops 를 연다', async () => {
    await 대시보드.열기();
    const 대시보드메뉴 = await verify('왼쪽 메뉴에 「대시보드」가 보인다', await 틀.메뉴항목('대시보드').isVisible(), true);
    const 회원메뉴 = await verify('왼쪽 메뉴에 「회원」이 보인다', await 틀.메뉴항목('회원').isVisible(), true);
    const 주문메뉴 = await verify('왼쪽 메뉴에 「주문」이 보인다', await 틀.메뉴항목('주문').isVisible(), true);
    const 상품메뉴 = await verify('왼쪽 메뉴에 「상품」이 보인다', await 틀.메뉴항목('상품').isVisible(), true);
    const 문의메뉴 = await verify('왼쪽 메뉴에 「문의」가 보인다', await 틀.메뉴항목('문의').isVisible(), true);
    const 게시판메뉴 = await verify('왼쪽 메뉴에 「게시판」이 보인다', await 틀.메뉴항목('게시판').isVisible(), true);
    const 알림쿠폰메뉴 = await verify('왼쪽 메뉴에 「알림 · 쿠폰」이 보인다', await 틀.메뉴항목('알림 · 쿠폰').isVisible(), true);
    const 시험데이터메뉴 = await verify('왼쪽 메뉴에 「시험 데이터」가 보인다', await 틀.메뉴항목('시험 데이터').isVisible(), true);
    const 변경기록메뉴 = await verify('왼쪽 메뉴에 「변경 기록」이 보인다', await 틀.메뉴항목('변경 기록').isVisible(), true);
    const 환경메뉴 = await verify('왼쪽 메뉴에 「환경」이 보인다', await 틀.메뉴항목('환경').isVisible(), true);
    await verify(
      '운영 화면 왼쪽 메뉴에 「대시보드」 · 「회원」 · 「주문」 · 「상품」 · 「문의」 · 「게시판」 · 「알림 · 쿠폰」 · 「시험 데이터」 · 「변경 기록」 · 「환경」이 보인다',
      대시보드메뉴 && 회원메뉴 && 주문메뉴 && 상품메뉴 && 문의메뉴 && 게시판메뉴 && 알림쿠폰메뉴 && 시험데이터메뉴 && 변경기록메뉴 && 환경메뉴,
      true,
    );
  });
});
