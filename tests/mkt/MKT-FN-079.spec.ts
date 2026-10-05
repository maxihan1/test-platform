import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-079',
  name: '홈 화면에서 15초를 기다리면 「만족도 설문」 모달이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업은 이미 닫았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 열린탭 = [] as import('@playwright/test').Page[];

  try {
    await test.step('홈 화면을 연다', async () => {
      await page.context().clock.install();
      await 안내창끄기(page, { 설문: false });
      await 홈.열기();
      await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
      await verify('공지 팝업은 이미 닫았다', await 홈.공지팝업.count(), 0, { blocker: true });
    });

    await test.step('홈 화면에서 15초를 기다린다', async () => {
      await page.context().clock.fastForward(15000);
      await 홈.설문.waitFor({ timeout: 3000 }).catch(() => undefined);
      await verify('홈 화면에서 15초를 기다리면 「만족도 설문」 모달이 보인다', await 홈.설문.isVisible(), true);
    });

    await test.step('설문 모달의 「다음에」를 누른다', async () => {
      await 홈.설문다음에버튼.click();
      await page.context().clock.fastForward(1000);
      await verify('「다음에」를 누르면 설문 모달이 닫힌다', await 홈.설문.count(), 0);
    });

    await test.step('같은 탭에서 홈 화면을 새로 고치고 15초를 기다린다', async () => {
      await 홈.새로고침();
      await page.context().clock.fastForward(15000);
      await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
      await verify('한 번 닫은 탭에서는 설문 모달이 다시 보이지 않는다', await 홈.설문.count(), 0);
    });

    await test.step('새 탭에서 홈 화면을 열고 설문의 「참여하기」를 누른다', async () => {
      const 새탭 = await page.context().newPage();
      열린탭.push(새탭);
      const 새홈 = new 홈화면(새탭);
      const 고객센터 = new 고객센터화면(새탭);
      await 안내창끄기(새탭, { 설문: false });
      await 새홈.열기();
      await page.context().clock.fastForward(15000);
      await 새홈.설문.waitFor({ timeout: 3000 });
      await 새홈.설문참여버튼.click();
      await 고객센터.제목.waitFor();
      await verify('「참여하기」를 누르면 고객센터 화면으로 간다', new URL(새탭.url()).pathname, '/support');
    });
  } finally {
    for (const 탭 of 열린탭) await 탭.close();
  }
});
