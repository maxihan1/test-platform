import { defineCase, test, verify } from '@platform/kit';
import { 홈공지팝업 } from './components/home-popup.component.js';
import { 화면안확인 } from './components/viewport.component.js';
import { 머리글 } from './components/site-header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-005',
  name: '「전체메뉴」 버튼을 누르면 「코디세이 세계관」 링크가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '화면 너비가 390px 이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 팝업 = new 홈공지팝업(page);
  const 안확인 = new 화면안확인(page);

  await test.step('화면 너비를 390px 로 맞춘다', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  await test.step('홈 화면을 연다', async () => {
    await 홈.연다();
  });

  await test.step('홈 화면이 열렸는지 확인한다', async () => {
    await 홈.첫제목.waitFor();
    await verify(
      '홈 화면에 「학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정」 제목이 보인다',
      await 홈.첫제목.isVisible(),
      true,
      { blocker: true },
    );
  });

  await test.step('홈 화면에서 「전체메뉴」 버튼을 누른다', async () => {
    await 팝업.모두닫는다();
    await 머리.전체메뉴버튼.click();
    const 세계관 = 홈.전체메뉴링크('코디세이 세계관');
    await verify('「전체메뉴」 버튼을 누르면 「코디세이 세계관」 링크가 보인다', await 안확인.화면안에보인다(세계관), true);
  });
});
