import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 고객센터화면 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-030',
  name: '상담 버튼을 누르면 상담 창이 열리고 메시지를 보내면 1초쯤 뒤 자동 답변이 보인다',
  precondition: ['비회원이다', '상담 창이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  const 머리 = new 머리글(page);

  await test.step('상담 버튼을 누른다', async () => {
    await 화면.열기();
    await 화면.FAQ제목().waitFor();
    await 머리.로그인링크().waitFor();
    await 화면.상담버튼().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    const 전 = await 화면.상담창().isVisible();
    await 화면.상담버튼().click();
    await 화면.상담메시지칸().waitFor();
    await verify('상담 버튼을 누르면 상담 창이 열린다', [전, await 화면.상담창().isVisible()], [false, true]);
  });

  await test.step('메시지를 보낸다', async () => {
    await verify('상담 창이 열려 있다', await 화면.상담창().isVisible(), true, { blocker: true });
    await 화면.상담메시지보내기('안녕하세요');
    await 화면.상담말풍선('안녕하세요').waitFor();
    const 바로뒤 = await 화면.상담말풍선('상담원 연결 중입니다. 잠시만 기다려 주세요.').isVisible();
    await 화면.상담말풍선('상담원 연결 중입니다. 잠시만 기다려 주세요.').waitFor({ timeout: 3000 });
    await verify(
      '메시지를 보내면 1초쯤 뒤 자동 답변 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 보인다',
      [바로뒤, await 화면.상담말풍선('상담원 연결 중입니다. 잠시만 기다려 주세요.').isVisible()],
      [false, true],
    );
  });
});
