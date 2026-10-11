import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-261',
  name: '상담 창에서 메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상담 = new 상담창(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('홈 화면을 준비한다', async () => {
    await page.goto('/');
  });

  await test.step('상담 버튼이 보이는지 확인한다', async () => {
    await 상담.상담버튼.waitFor();
    await verify('상담 버튼이 보인다', await 상담.상담버튼.isVisible(), true, { blocker: true });
  });

  await test.step('상담 창을 연다', async () => {
    await 상담.상담버튼.click();
  });

  await test.step('상담 창이 열렸는지 확인한다', async () => {
    await verify('상담 창이 보인다', await 상담.창.isVisible(), true, { blocker: true });
  });

  await test.step('상담 창에 메시지를 적어 보낸다', async () => {
    const 답변 = 상담.대화.getByText('상담원 연결 중입니다. 잠시만 기다려 주세요.');
    await 상담.입력칸.fill('안녕하세요');
    await 상담.보내기.click();
    const 시작 = Date.now();
    await 답변.waitFor();
    await verify('상담 창에서 메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 보인다', [await 답변.isVisible(), Date.now() - 시작 >= 800], [true, true]);
  });
});
