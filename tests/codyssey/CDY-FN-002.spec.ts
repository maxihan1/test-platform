import { defineCase, test, verify } from '@platform/kit';
import { 홈공지팝업 } from './components/home-popup.component.js';
import { 머리글 } from './components/site-header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-002',
  name: '「서울」 버튼을 누르면 「서울 개포 캠퍼스」 · 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 링크가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
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

  await test.step('홈 화면 머리글의 「서울」 버튼을 누른다', async () => {
    await 팝업.모두닫는다();
    await 머리.지역버튼.click();
    const 링크이름 = ['서울 개포 캠퍼스', '대전 대전 캠퍼스', '경남 경남 캠퍼스'];
    for (const 이름 of 링크이름) await 홈.지역링크(이름).waitFor();
    const 보임 = await Promise.all(링크이름.map((이름) => 홈.지역링크(이름).isVisible()));
    await verify('「서울」 버튼을 누르면 「서울 개포 캠퍼스」 · 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 링크가 보인다', 보임.every(Boolean), true);
  });
});
