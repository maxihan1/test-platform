import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 전환기록읽기, 전환기록하기 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-030',
  name: '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('너비 768px 로 홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 방해창막기(page);
    await 전환기록하기(page);
    await 홈.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    await verify('햄버거 버튼이 보인다', await 홈.머리글.햄버거.isVisible(), true, { blocker: true });
  });

  await test.step('햄버거 버튼을 누른다', async () => {
    const 처음화면밖 = await 홈.머리글메뉴가화면밖인가();
    await 홈.머리글.햄버거.click();
    await 홈.머리글메뉴가밀려나올때까지();
    const 기록 = await 전환기록읽기(page);
    await verify(
      '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
      {
        처음에는화면밖: 처음화면밖,
        누른뒤화면안: await 홈.머리글메뉴가화면안인가(),
        움직임: 기록.some((줄) => 줄.종류 === '전환' && 줄.이름 === 'transform' && 줄.대상.includes('gnb') && 줄.시간 === '0.3s'),
      },
      { 처음에는화면밖: true, 누른뒤화면안: true, 움직임: true },
    );
  });
});
