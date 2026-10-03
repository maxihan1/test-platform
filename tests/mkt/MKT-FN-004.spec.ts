import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-004',
  name: '햄버거 버튼을 누르면 메뉴가 열려 「커뮤니티」 「쇼핑」 「고객센터」가 보인다',
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('햄버거 버튼을 누른다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 홈.열기();
    await 머리.햄버거버튼().waitFor();
    await verify('화면 너비가 768px 이다', await 홈.화면너비(), 768, { blocker: true });
    await 홈.공지팝업닫기();
    await verify(
      '메뉴가 접혀 화면 밖에 있다',
      [await 홈.주메뉴링크가화면안에있는가('커뮤니티'), await 홈.주메뉴링크가화면안에있는가('쇼핑'), await 홈.주메뉴링크가화면안에있는가('고객센터')],
      [false, false, false],
      { blocker: true },
    );
    await 머리.햄버거버튼().click();
    await 홈.펼쳐진햄버거버튼().waitFor();
    await 홈.머리글움직임이끝나기를기다린다();
    await verify(
      '햄버거 버튼을 누르면 메뉴가 열려 「커뮤니티」 「쇼핑」 「고객센터」가 보인다',
      [await 홈.주메뉴링크가화면안에있는가('커뮤니티'), await 홈.주메뉴링크가화면안에있는가('쇼핑'), await 홈.주메뉴링크가화면안에있는가('고객센터')],
      [true, true, true],
    );
  });
});
