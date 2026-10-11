import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 결제완료주문번호 } from './helpers/member.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-265',
  name: '주문 내역 화면 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 주문내역화면(page);
  const 상세 = new 주문상세화면(page);
  const 수정 = new 회원정보수정화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원으로 주문 내역 화면을 연다', async () => {
    await 목록.열기();
    await verify(
      '주문 내역 화면 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보인다',
      {
        주문내역: await 목록.메뉴링크('주문 내역').isVisible(),
        회원정보수정: await 목록.메뉴링크('회원정보 수정').isVisible(),
        회원탈퇴: await 목록.메뉴링크('회원 탈퇴').isVisible(),
      },
      { 주문내역: true, 회원정보수정: true, 회원탈퇴: true },
    );
    const 현재메뉴 = 목록.메뉴링크('주문 내역');
    await verify(
      '주문 내역 화면 왼쪽 메뉴에서 「주문 내역」 이 강조되어 보인다',
      {
        현재: await 현재메뉴.getAttribute('aria-current'),
        굵게: Number(await 현재메뉴.evaluate((칸) => getComputedStyle(칸).fontWeight)) >= 600,
      },
      { 현재: 'page', 굵게: true },
    );
    const 날짜 = await 목록.날짜들();
    await verify(
      '주문 내역은 주문일이 최근인 것부터 보인다',
      { 두건이상: 날짜.length >= 2, 최근순: JSON.stringify(날짜) === JSON.stringify([...날짜].sort().reverse()) },
      { 두건이상: true, 최근순: true },
    );
    await verify(
      '주문 내역 각 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보이고 상품이 둘인 주문에는 「외 1건」 이 붙는다',
      {
        열머리: await 목록.열머리들.allInnerTexts(),
        빈칸있는줄: await 목록.빈칸있는줄수(),
        외1건: await 목록.외건수표시(결제완료주문번호).isVisible(),
      },
      { 열머리: ['주문일', '주문번호', '상품명', '결제 금액', '상태'], 빈칸있는줄: 0, 외1건: true },
    );
  });

  await test.step('주문 내역 기간에서 「전체」 를 누른다', async () => {
    await 목록.기간누르기('전체');
    const 색들 = await 목록.상태색들();
    const 상태 = new Set(색들.map((칸) => 칸.상태));
    const 색 = new Set(색들.map((칸) => 칸.색));
    await verify('주문 내역의 주문 상태마다 색이 다르게 보인다', { 상태가둘이상: 상태.size >= 2, 상태마다다른색: 색.size === 상태.size }, { 상태가둘이상: true, 상태마다다른색: true });
  });

  await test.step('결제완료 주문 상세 화면을 연다', async () => {
    await 상세.열기(결제완료주문번호);
    await verify(
      '주문 상세 화면에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다',
      {
        상품목록: await 상세.상품목록제목.isVisible(),
        배송지: await 상세.배송정보제목.isVisible(),
        결제정보: await 상세.결제정보제목.isVisible(),
        상태: await 상세.상태배지.isVisible(),
      },
      { 상품목록: true, 배송지: true, 결제정보: true, 상태: true },
    );
  });

  await test.step('회원으로 회원정보 수정 화면을 연다', async () => {
    await 수정.열기();
    await verify(
      '회원정보 수정 화면에 비밀번호 재확인 칸과 「비밀번호 확인」 버튼이 먼저 보인다',
      { 재확인칸: await 수정.재확인칸.isVisible(), 비밀번호확인버튼: await 수정.비밀번호확인버튼.isVisible() },
      { 재확인칸: true, 비밀번호확인버튼: true },
    );
  });
});
