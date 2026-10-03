import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-002',
  name: '홈 화면을 내리면 「맨 위로」 버튼이 나타나 맨 위로 올려 주고 머리글이 붙어 따라 내려온다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 한 화면 이상 내린 뒤 「맨 위로」를 누른다', async () => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await 홈.열기();
    await 홈.공지팝업닫기();
    await 홈.아래로내리기(600);
    await 홈.스크롤이멈추기를기다린다();
    const 버튼위치 = await 홈.화면중심기준위치(홈.맨위로버튼());
    await verify(
      '한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
      [await 홈.맨위로버튼().isVisible(), 버튼위치.가로 > 0, 버튼위치.세로 > 0],
      [true, true, true],
      { blocker: true },
    );
    await 홈.맨위로버튼().click();
    await 홈.맨위로버튼().waitFor({ state: 'hidden' });
    await 홈.스크롤이멈추기를기다린다();
    await verify('「맨 위로」를 누르면 화면이 맨 위로 올라간다', await 홈.스크롤위치(), 0);
  });

  await test.step('홈 화면을 80px 이상 내린다', async () => {
    await 홈.머리글움직임이끝나기를기다린다();
    const 내리기전높이 = (await 홈.머리글안쪽().boundingBox())?.height;
    await 홈.아래로내리기(100);
    await 홈.붙은머리글().waitFor();
    await 홈.머리글움직임이끝나기를기다린다();
    const 내린뒤높이 = (await 홈.머리글안쪽().boundingBox())?.height;
    await verify(
      '화면을 80px 이상 내리면 머리글이 화면 위에 붙어 따라 내려온다',
      [(await 홈.스크롤위치()) > 80, (await 머리.영역().boundingBox())?.y],
      [true, 0],
    );
    await verify('화면을 80px 이상 내리면 머리글 높이가 64px 에서 48px 로 줄어든다', [내리기전높이, 내린뒤높이], [64, 48]);
  });
});
