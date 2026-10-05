import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 내려받은첫줄, 오늘날짜8자리 } from './components/member-helpers.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-546',
  name: '「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다',
  held: '보류 — 관리자 계정 비밀번호가 실행 환경에 없다(테스트 계정은 회원 하나다)',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 관리자계정값(params);
  const 관리자 = new 관리자화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('「주문 내역 내려받기」를 누른다', async () => {
    await 관리자.열기();
    await 관리자.패널열기(관리자.내려받기링크);
    const 내려받기 = await 관리자.주문내역내려받기();
    await verify(
      '「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다',
      내려받기.suggestedFilename(),
      `orders-${오늘날짜8자리()}.csv`,
    );
    await verify('내려받은 파일의 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」다', await 내려받은첫줄(내려받기), '주문번호,주문일,아이디,결제금액,상태');
  });
});
