import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 바닥글 } from './components/footer.component.js';
import { 머리글 } from './components/header.component.js';
import { 쿠키띠가내용을덮는가, 일부막기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-011',
  name: '쿠키에 동의하기 전에는 쿠키 안내 띠가 화면 아래 내용을 덮는다',
  platforms: ['desktop'],
  precondition: ['이 브라우저에서 처음 방문한다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 바닥 = new 바닥글(page);
  const 상담 = new 상담창(page);

  await test.step('처음 방문한 브라우저로 홈 화면을 연다', async () => {
    await 일부막기(page, { 공지: true, 설문: true });
    await 홈.열기();
    await 상담.상담버튼.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('이 브라우저에 쿠키 동의 기록이 없다', await page.evaluate(() => localStorage.getItem('dm_cookie_ok')), null, { blocker: true });
    await verify(
      '쿠키에 동의하기 전에는 쿠키 안내 띠가 화면 아래 내용을 덮는다',
      { 보임: await 바닥.쿠키띠.isVisible(), 내용위에뜸: await 쿠키띠가내용을덮는가(page) },
      { 보임: true, 내용위에뜸: true },
    );
  });

  await test.step('쿠키 안내 띠에서 「동의」 를 누른다', async () => {
    await 바닥.쿠키동의버튼.click();
    await verify('쿠키 안내 띠에서 「동의」 를 누르면 띠가 사라진다', await 바닥.쿠키띠.isVisible(), false);
  });

  await test.step('같은 브라우저로 홈 화면을 다시 연다', async () => {
    await 홈.열기();
    await 상담.상담버튼.waitFor();
    await verify('쿠키에 동의한 브라우저로 홈 화면을 다시 열면 쿠키 안내 띠가 보이지 않는다', await 바닥.쿠키띠.isVisible(), false);
  });
});
