import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-492',
  name: '노출 배너가 두 장이면 홈 배너가 그 순서대로 두 장만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '배너 목록은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await page.context().route('**/api/banners', async (경로) => {
    await 경로.fulfill({
      json: {
        items: [
          { id: 2, title: '전자기기 기획전', subtitle: '무선 이어폰 특가', color: '#1d4ed8', visible: true },
          { id: 1, title: '가을 신상 컬렉션', subtitle: '최대 30% 할인', color: '#c2410c', visible: true },
        ],
      },
    });
  });
  try {
    await test.step('배너 응답을 순서를 바꾸고 하나를 뺀 목록으로 둔 채 홈 화면을 연다', async () => {
      await 홈.열기();
      await 홈.배너.그려질때까지();
      await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
      await verify('노출 배너가 두 장이면 홈 배너가 그 순서대로 두 장만 보인다', (await 홈.배너.장제목들.allInnerTexts()).join(', '), '전자기기 기획전, 가을 신상 컬렉션');
    });
  } finally {
    await page.context().unroute('**/api/banners');
  }
});
