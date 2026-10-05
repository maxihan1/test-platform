import { defineCase, test, verify } from '@platform/kit';
import { 지원혜택화면 } from './pages/apply-benefits.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-034',
  name: '「다음 영상」을 누르면 보이는 영상이 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 지원혜택 = new 지원혜택화면(page);

  await test.step('지원혜택 화면을 연다', async () => {
    await 지원혜택.연다();
  });

  await test.step('지원혜택 화면이 열렸는지 확인한다', async () => {
    await 지원혜택.제목.waitFor();
    await 지원혜택.보이는영상.waitFor();
    await verify('지원혜택 화면에 「지원혜택」 제목이 보인다', await 지원혜택.제목.isVisible(), true, { blocker: true });
  });

  await test.step('지원혜택 화면에서 「다음 영상」을 누른다', async () => {
    const 이전제목 = (await 지원혜택.보이는영상.getAttribute('title')) ?? '';
    const 이전주소 = (await 지원혜택.보이는영상.getAttribute('src')) ?? '';
    await 지원혜택.다음영상을누른다();
    await 지원혜택.이전과다른영상(이전제목).waitFor();
    await verify('「다음 영상」을 누르면 보이는 영상이 바뀐다', (await 지원혜택.보이는영상.getAttribute('src')) !== 이전주소, true);
  });
});
