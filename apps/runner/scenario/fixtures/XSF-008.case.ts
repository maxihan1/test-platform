// 시나리오 실측용 가짜 케이스 — 글을 만들고 finally 에서 지우되 204 만 받는다. 데모마켓 정리 함수(탈퇴 · 글 지우기)와 같은 꼴이다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-008',
  name: '글을 만들고 끝에 204 로만 지운다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 글번호: number | undefined;
  try {
    await test.step('글을 만든다', async () => {
      const 응답 = await page.request.post('/api/posts', { data: { 제목: '첫 글' } });
      글번호 = ((await 응답.json()) as { id: number }).id;
      await verify('글이 만들어진다', 응답.status(), 201);
    });
  } finally {
    if (글번호 !== undefined) {
      const 응답 = await page.request.delete(`/api/posts/${글번호}`);
      if (응답.status() !== 204) throw new Error(`글 지우기 실패: ${String(응답.status())}`);
    }
  }
});
