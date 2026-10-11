import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 바닥글 } from './components/footer.component.js';
import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-001',
  name: '홈 화면 머리글에 로고 「데모마켓」, 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」, 로그인 영역과 장바구니 아이콘이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '이 브라우저에서 처음 방문한다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 바닥 = new 바닥글(page);
  const 상담 = new 상담창(page);

  await test.step('비회원으로 홈 화면을 연다', async () => {
    await 홈.열기();
    await 머리.로그인링크.waitFor();
    await 상담.상담버튼.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '이 브라우저에 쿠키 동의 기록이 없다',
      await page.evaluate(() => localStorage.getItem('dm_cookie_ok')),
      null,
      { blocker: true },
    );

    await verify(
      '홈 화면 머리글에 로고 「데모마켓」, 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」, 로그인 영역과 장바구니 아이콘이 보인다',
      {
        로고: await 머리.로고.innerText(),
        메뉴: [await 머리.커뮤니티메뉴.innerText(), await 머리.쇼핑메뉴.innerText(), await 머리.고객센터메뉴.innerText()],
        로그인영역: await 머리.로그인링크.isVisible(),
        장바구니아이콘: await 머리.장바구니링크.isVisible(),
      },
      { 로고: '데모마켓', 메뉴: ['커뮤니티', '쇼핑', '고객센터'], 로그인영역: true, 장바구니아이콘: true },
    );
    await verify(
      '비회원으로 연 홈 화면 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다',
      { 로그인: await 머리.로그인링크.isVisible(), 회원가입: await 머리.회원가입링크.isVisible(), 오른쪽: await 홈.오른쪽에있는가(머리.회원가입링크) },
      { 로그인: true, 회원가입: true, 오른쪽: true },
    );
    await verify('비회원으로 연 홈 화면 머리글에 장바구니 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    await verify(
      '홈 화면 바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」 문구가 보인다',
      { 이용약관: await 바닥.이용약관링크.isVisible(), 개인정보처리방침: await 바닥.개인정보링크.isVisible(), 저작권: await 바닥.저작권문구.innerText() },
      { 이용약관: true, 개인정보처리방침: true, 저작권: '© 2026 DemoMarket' },
    );
    const 띠 = await 바닥.쿠키띠.boundingBox();
    await verify(
      '처음 연 홈 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」 와 「동의」 버튼이 보인다',
      {
        문구: await 바닥.쿠키띠.getByText('서비스 개선을 위해 쿠키를 사용합니다.').innerText(),
        동의: await 바닥.쿠키동의버튼.isVisible(),
        아래: 띠 !== null && Math.round(띠.y + 띠.height) === page.viewportSize()?.height,
      },
      { 문구: '서비스 개선을 위해 쿠키를 사용합니다.', 동의: true, 아래: true },
    );
    await verify(
      '홈 화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
      { 보임: await 상담.상담버튼.isVisible(), 오른쪽아래: await 홈.오른쪽아래에있는가(상담.상담버튼), 글자: await 상담.상담버튼.innerText() },
      { 보임: true, 오른쪽아래: true, 글자: '💬' },
    );
    await verify(
      '홈 화면 위쪽에 배너 3장이 보인다',
      { 장수: await 홈.슬라이드들.count(), 위쪽: await 홈.아래에있는가(홈.배너, 홈.탭들.first()) },
      { 장수: 3, 위쪽: true },
    );
    await verify(
      '홈 배너 좌우에 「이전」 · 「다음」 화살표가 있고 아래에 점 3개가 보인다',
      await 홈.배너배치(),
      { 이전왼쪽: true, 다음오른쪽: true, 점아래: true, 점수: 3 },
    );
    await verify(
      '홈 배너 아래에 「인기글」 · 「최신글」 탭이 보이고 「인기글」 이 골라져 있다',
      {
        탭: await 홈.탭들.allInnerTexts(),
        인기글고름: await 홈.인기글탭.getAttribute('aria-selected'),
        배너아래: await 홈.아래에있는가(홈.배너, 홈.탭들.first()),
      },
      { 탭: ['인기글', '최신글'], 인기글고름: 'true', 배너아래: true },
    );
    await verify(
      '홈 탭 아래에 「추천 상품」 8개가 가로 한 줄로 보인다',
      { 개수: await 홈.추천카드.count(), 줄수: await 홈.추천카드가로줄수(), 탭아래: await 홈.아래에있는가(홈.탭들.first(), 홈.추천카드.first()) },
      { 개수: 8, 줄수: 1, 탭아래: true },
    );
  });
});
