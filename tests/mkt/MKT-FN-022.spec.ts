import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 일부막기 } from './helpers/home.helper.js';
import { 고객센터화면 } from './pages/support.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-022',
  name: '홈 화면에 머문 지 15초 안에 「만족도 설문」 모달이 뜬다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);

  await test.step('홈 화면에서 15초까지 기다린다', async () => {
    await 일부막기(page, { 쿠키: true, 공지: true });
    await page.clock.install();
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await page.clock.runFor(15000);
    await verify(
      '홈 화면에 머문 지 15초 안에 「만족도 설문」 모달이 뜬다',
      { 보임: await 창.창.isVisible(), 제목: await 창.제목.innerText() },
      { 보임: true, 제목: '만족도 설문' },
    );
  });

  await test.step('만족도 설문에서 「다음에」 를 누른다', async () => {
    await 창.버튼('다음에').click();
    await page.clock.runFor(500);
    await verify('만족도 설문에서 「다음에」 를 누르면 모달이 닫힌다', await 창.창.isVisible(), false);
  });

  await test.step('같은 탭에서 홈 화면을 다시 열고 15초를 기다린다', async () => {
    await 홈.추천까지열기();
    await page.clock.runFor(15000);
    await verify('만족도 설문을 닫은 탭에서는 홈 화면을 다시 열어도 설문이 뜨지 않는다', await 창.창.isVisible(), false);
  });

  await test.step('새 탭에서 만족도 설문의 「참여하기」 를 누른다', async () => {
    const 새탭 = await page.context().newPage();
    try {
      await 일부막기(새탭, { 쿠키: true, 공지: true });
      await 새탭.clock.install();
      await new 홈화면(새탭).추천까지열기();
      await 새탭.clock.runFor(15000);
      await new 모달(새탭).버튼('참여하기').click();
      await new 고객센터화면(새탭).제목.waitFor();
      await verify('만족도 설문에서 「참여하기」 를 누르면 고객센터 화면으로 간다', new URL(새탭.url()).pathname, '/support');
    } finally {
      await 새탭.close();
    }
  });
});
