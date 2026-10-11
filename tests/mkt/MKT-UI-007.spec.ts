import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 화면로그인 } from './helpers/account.helper.js';
import { 장바구니읽기 } from './helpers/cart.helper.js';
import { 가운데에보이는가, 일부막기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-007',
  name: '회원으로 연 홈 화면 머리글 오른쪽에 「{이름}님」 · 「마이페이지」 · 「로그아웃」 이 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);

  await test.step('회원으로 로그인한다', async () => {
    await 일부막기(page, { 쿠키: true, 설문: true });
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원으로 홈 화면을 연다', async () => {
    await 홈.열기();
    await 머리.장바구니배지.waitFor();
    await 창.창.waitFor();
    const 이름 = ((await (await page.request.get('/api/auth/me')).json()) as { name: string }).name;
    const 줄수 = (await 장바구니읽기(page.request)).length;

    await verify(
      '회원으로 연 홈 화면 머리글 오른쪽에 「{이름}님」 · 「마이페이지」 · 「로그아웃」 이 보인다',
      {
        인사: await 머리.인사.innerText(),
        마이페이지: await 머리.마이페이지링크.isVisible(),
        로그아웃: await 머리.로그아웃버튼.isVisible(),
        오른쪽: await 홈.오른쪽에있는가(머리.로그아웃버튼),
      },
      { 인사: `${이름}님`, 마이페이지: true, 로그아웃: true, 오른쪽: true },
    );
    const 빨강 = await 머리.장바구니배지.evaluate((칸) => {
      const 색 = (getComputedStyle(칸).backgroundColor.match(/\d+/g) ?? []).map(Number);
      return 색.length >= 3 && (색[0] ?? 0) > 180 && (색[1] ?? 255) < 90 && (색[2] ?? 255) < 90;
    });
    await verify(
      '회원으로 연 홈 화면 장바구니 아이콘 옆에 담긴 상품 줄 수가 빨간 숫자 배지로 보인다',
      { 숫자: await 머리.장바구니배지.innerText(), 빨강 },
      { 숫자: String(줄수), 빨강: true },
    );
    await verify('회원으로 연 홈 화면 머리글에 알림 종 아이콘이 보인다', await 머리.알림종.isVisible(), true);
    const 점 = await 홈.점상태();
    await verify(
      '홈 배너 아래 점 가운데 현재 장의 점만 색이 채워져 보인다',
      { 점수: 점.length, 현재하나: 점.filter((d) => d.현재).length, 현재만채움: 점.every((d) => d.현재 === d.채움) },
      { 점수: 3, 현재하나: 1, 현재만채움: true },
    );
    await verify(
      '처음 연 홈 화면 가운데에 공지 팝업이 보인다',
      { 보임: await 창.창.isVisible(), 제목: await 창.제목.innerText(), 가운데: await 가운데에보이는가(page, 창.창) },
      { 보임: true, 제목: '공지사항', 가운데: true },
    );
    await verify(
      '홈 공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      { 닫기: await 창.버튼('닫기').isVisible(), 체크박스: await 홈.공지체크박스.isVisible() },
      { 닫기: true, 체크박스: true },
    );
    await 홈.글링크들.first().waitFor();
    const 좋아요 = await 홈.글좋아요들();
    await verify(
      '홈 「인기글」 탭에 좋아요가 많은 순으로 글 5건이 보인다',
      { 건수: 좋아요.length, 많은순: 좋아요.every((값, i) => i === 0 || (좋아요[i - 1] ?? 0) >= 값), 인기글고름: await 홈.인기글탭.getAttribute('aria-selected') },
      { 건수: 5, 많은순: true, 인기글고름: 'true' },
    );
    const 시계글 = await 홈.카운트다운.innerText();
    await verify(
      '홈 탭 위에 「타임세일 종료까지 HH:MM:SS」 꼴 카운트다운이 보인다',
      { 꼴: /^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/.test(시계글.trim()), 탭위: await 홈.아래에있는가(홈.카운트다운, 홈.탭들.first()) },
      { 꼴: true, 탭위: true },
    );
  });
});
