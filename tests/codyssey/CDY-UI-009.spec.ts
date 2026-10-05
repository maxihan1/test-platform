import { defineCase, test, verify } from '@platform/kit';
import { 캠퍼스안내화면 } from './pages/about-campus.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-009',
  name: '캠퍼스 안내 화면에 「캠퍼스 안내」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 캠퍼스안내 = new 캠퍼스안내화면(page);

  await test.step('캠퍼스 안내 화면을 연다', async () => {
    await 캠퍼스안내.연다();
    await 캠퍼스안내.제목.waitFor();
    await verify('캠퍼스 안내 화면에 「캠퍼스 안내」 제목이 보인다', await 캠퍼스안내.제목.isVisible(), true, { blocker: true });
    await verify('「지역별 Codyssey 캠퍼스」 · 「오시는 길」 제목이 보인다', (await 캠퍼스안내.소제목('지역별 Codyssey 캠퍼스').isVisible()) && (await 캠퍼스안내.소제목('오시는 길').isVisible()), true);
  });
});
