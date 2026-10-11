import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 상담창 } from './components/chat.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-128',
  name: '상담 버튼을 누르면 상담 창이 열린다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 상담 = new 상담창(page);

  await test.step('오른쪽 아래 상담 버튼을 누른다', async () => {
    await 방해막기(page);
    await page.clock.install();
    await 홈.열기();
    await 상담.상담버튼.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await 상담.상담버튼.click();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 상담.창.isVisible(), true);
  });

  await test.step('상담 창에 메시지를 적고 「보내기」 를 누른다', async () => {
    const 답변 = 상담.기록.getByText('상담원 연결 중입니다. 잠시만 기다려 주세요.');
    await 상담.입력칸.fill('배송은 언제 오나요');
    await 상담.보내기.click();
    const 바로 = await 답변.count();
    await page.clock.runFor(1000);
    await verify(
      '상담 창에서 메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」 가 자동 답변으로 온다',
      { 보내고바로: 바로, 일초뒤: await 답변.count() },
      { 보내고바로: 0, 일초뒤: 1 },
    );
  });
});
