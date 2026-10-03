import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number };

export const spec = defineCase({
  tcId: 'MKT-FN-047',
  name: '상세를 열 때마다 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

const 조회수 = (글자: string): number => Number(글자.replace('조회수 ', ''));

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 글들 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 대상 = 글들[글들.length - 1]?.id ?? 0;

  await test.step('게시글 상세 화면을 연 뒤 다시 연다', async () => {
    await 상세.열기(대상);
    await 상세.댓글제목().waitFor();
    const 처음 = 조회수(await 상세.조회수표시().innerText());
    await 상세.열기(대상);
    await 상세.댓글제목().waitFor();
    const 다시 = 조회수(await 상세.조회수표시().innerText());
    await verify('상세를 열 때마다 조회수가 1 오른다', 다시, 처음 + 1);
  });
});
