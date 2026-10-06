import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-058',
  name: '체크박스를 끈 채 「닫기」를 누르면 공지 팝업이 사라진다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await verify('처음 방문한 비회원이다', [await 홈.머리글.로그인링크.isVisible(), await 홈.쿠키띠.영역.isVisible()], [true, true], { blocker: true });
  });

  await test.step('공지 팝업에서 체크박스를 끈 채 「닫기」를 누른다', async () => {
    await verify('공지 팝업 체크박스가 꺼져 있다', await 홈.공지체크박스.isChecked(), false, { blocker: true });
    await 홈.공지닫기버튼.click();
    await page.waitForTimeout(600);
    await verify('체크박스를 끈 채 「닫기」를 누르면 공지 팝업이 사라진다', await 홈.공지팝업.count(), 0);
  });

  await test.step('홈 화면을 새로 고친다', async () => {
    await 홈.새로고침();
    await verify('체크하지 않고 닫았으면 새로 고칠 때 공지 팝업이 다시 보인다', await 홈.공지팝업.isVisible(), true);
  });

  await test.step('공지 팝업에서 「오늘 하루 보지 않기」를 켜고 「닫기」를 누른다', async () => {
    await 홈.공지체크박스.check();
    await 홈.공지닫기버튼.click();
    await page.waitForTimeout(600);
    await verify('체크하고 닫은 공지 팝업이 사라진다', await 홈.공지팝업.count(), 0);
  });

  await test.step('홈 화면을 한 번 더 새로 고친다', async () => {
    await 홈.새로고침();
    await verify('체크하고 닫았으면 같은 날 다시 들어와도 공지 팝업이 보이지 않는다', await 홈.공지팝업.count(), 0);
  });
});
