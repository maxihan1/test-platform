import { defineCase, test, verify } from '@platform/kit';
import { 홈공지팝업 } from './components/home-popup.component.js';
import { 바닥글 } from './components/site-footer.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-004',
  name: '「Family Site」 버튼을 누르면 「과학기술정보통신부」 · 「정보통신기획평가원」 · 「서울특별시」 · 「이노베이션아카데미」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 바닥 = new 바닥글(page);
  const 팝업 = new 홈공지팝업(page);

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

  await test.step('홈 화면 바닥글의 「Family Site」 버튼을 누른다', async () => {
    await 팝업.모두닫는다();
    await 바닥.패밀리사이트버튼.click();
    const 버튼이름 = ['과학기술정보통신부', '정보통신기획평가원', '서울특별시', '이노베이션아카데미'];
    for (const 이름 of 버튼이름) await 홈.바닥글버튼(이름).waitFor();
    const 보임 = await Promise.all(버튼이름.map((이름) => 홈.바닥글버튼(이름).isVisible()));
    await verify(
      '「Family Site」 버튼을 누르면 「과학기술정보통신부」 · 「정보통신기획평가원」 · 「서울특별시」 · 「이노베이션아카데미」 버튼이 보인다',
      보임.every(Boolean),
      true,
    );
  });
});
