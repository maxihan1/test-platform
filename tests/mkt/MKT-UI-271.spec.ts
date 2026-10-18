import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 상담창 } from './components/chat.component.js';
import { 머리글 } from './components/header.component.js';

export const spec = defineCase({
  tcId: 'MKT-UI-271',
  name: '홈 화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상담 = new 상담창(page);
  const 머리 = new 머리글(page);

  const 오른쪽아래인가 = async (): Promise<boolean> => {
    const 상자 = await 상담.상담버튼.boundingBox();
    const 화면 = page.viewportSize();
    if (!상자 || !화면) return false;
    return 상자.x + 상자.width / 2 > 화면.width / 2 && 상자.y + 상자.height / 2 > 화면.height / 2;
  };

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('홈 화면 오른쪽 아래를 확인한다', async () => {
    await page.goto('/');
    await 머리.그려질때까지();
    await 상담.상담버튼.waitFor();
    await 두프레임뒤(page);
    await verify(
      '홈 화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
      { 보임: await 상담.상담버튼.isVisible(), 말풍선: (await 상담.상담버튼.innerText()).includes('💬'), 오른쪽아래: await 오른쪽아래인가() },
      { 보임: true, 말풍선: true, 오른쪽아래: true },
    );
  });

  await test.step('상품 목록 화면 오른쪽 아래를 확인한다', async () => {
    await 머리.메뉴누르기('쇼핑');
    await page.getByRole('heading', { name: '쇼핑', level: 1 }).waitFor();
    await 상담.상담버튼.waitFor();
    await 두프레임뒤(page);
    await verify(
      '상품 목록 화면 오른쪽 아래에도 상담 버튼이 보인다',
      { 보임: await 상담.상담버튼.isVisible(), 오른쪽아래: await 오른쪽아래인가() },
      { 보임: true, 오른쪽아래: true },
    );
  });
});
