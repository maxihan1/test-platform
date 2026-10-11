import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 응답붙잡기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-021',
  name: '홈 화면을 열면 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」 이 늦게 배너와 탭 사이에 들어온다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 열고 이벤트 띠를 기다린다', async () => {
    const 붙잡음 = await 응답붙잡기(page.context(), /\/api\/event-strip$/);
    try {
      await 방해막기(page);
      await 홈.추천까지열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify('이벤트 띠가 아직 들어오지 않았다', await 홈.이벤트띠.count(), 0, { blocker: true });
      const 전 = (await 홈.탭들.first().boundingBox())?.y ?? 0;
      붙잡음.놓기();
      await 홈.이벤트띠.waitFor();
      await verify(
        '홈 화면을 열면 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」 이 늦게 배너와 탭 사이에 들어온다',
        {
          문구: await 홈.이벤트띠문구.isVisible(),
          배너아래: await 홈.아래에있는가(홈.배너, 홈.이벤트띠),
          탭위: await 홈.아래에있는가(홈.이벤트띠, 홈.탭들.first()),
        },
        { 문구: true, 배너아래: true, 탭위: true },
      );
      const 후 = (await 홈.탭들.first().boundingBox())?.y ?? 0;
      await verify('이벤트 띠가 들어오면 탭이 아래로 밀려난다', 후 > 전, true);
    } finally {
      붙잡음.놓기();
      await 붙잡음.풀기();
    }
  });

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.이벤트띠닫기.click();
    await verify('이벤트 띠의 X 를 누르면 띠가 사라진다', await 홈.이벤트띠.isVisible(), false);
  });
});
