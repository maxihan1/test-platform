import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 오류응답걸기 } from './helpers/mock.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-117',
  name: 'FAQ 응답이 500 이면 고객센터 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop'],
  precondition: ['FAQ 응답은 500 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('FAQ 응답을 500 으로 주고 고객센터 화면을 연다', async () => {
      await 방해막기(page);
      풀기 = await 오류응답걸기(page.context(), /\/api\/faq$/, 500, { code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' });
      await page.goto(고객센터화면.주소);
      await 알림.글('잠시 후 다시 시도해 주세요').waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      const 상태 = await page.evaluate(async () => (await fetch('/api/faq')).status);
      await verify('FAQ 응답이 500 이다', 상태, 500, { blocker: true });
      await verify(
        'FAQ 응답이 500 이면 고객센터 화면이 깨지지 않고 오류 안내가 보인다',
        { 제목: await 고객센터.제목.isVisible(), 탭: await 고객센터.탭들.count(), 안내: await 고객센터.패널.innerText() },
        { 제목: true, 탭: 4, 안내: '잠시 후 다시 시도해 주세요' },
      );
    });
  } finally {
    await 풀기?.();
  }
});
