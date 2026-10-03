import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-007',
  name: '머리의 지역 버튼 「서울」을 누르면 지역 「서울 개포 캠퍼스」 「대전 대전 캠퍼스」 「경남 경남 캠퍼스」가 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 홈화면(page);
  const 머리부 = new 머리(page);

  await test.step('홈 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('머리의 지역 버튼 「서울」을 누른다', async () => {
    await 머리부.지역버튼().click();
    await 머리부.지역링크('경남 경남 캠퍼스').waitFor();
    await verify(
      '머리의 지역 버튼 「서울」을 누르면 지역 「서울 개포 캠퍼스」 「대전 대전 캠퍼스」 「경남 경남 캠퍼스」가 보인다',
      (await 화면.보이는지역링크(['서울 개포 캠퍼스', '대전 대전 캠퍼스', '경남 경남 캠퍼스'])).join(', '),
      '서울 개포 캠퍼스, 대전 대전 캠퍼스, 경남 경남 캠퍼스',
    );
  });
});
