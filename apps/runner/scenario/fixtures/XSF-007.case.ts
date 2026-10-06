// 시나리오 실측용 가짜 케이스 — @playwright/test 의 request 로 연결을 직접 만들어 finally 에서 지우고, 직접 만든 창의 request 로 모킹된 주소를 부른다 (apps/runner/scenario/e2e.test.ts)
// 표본 케이스가 다른 역할 계정 · 브라우저 다시 열기를 이렇게 쓴다 (시나리오 §3.7 결정 12 「한계」)

import { request as 요청도구 } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-007',
  name: '직접 만든 연결과 창',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 연결 = await 요청도구.newContext();
  let 글번호: number | undefined;
  try {
    await test.step('연결로 글을 만든다', async () => {
      await 연결.post('/api/login');
      const 응답 = await 연결.post('/api/posts', { data: { 제목: '연결 글' } });
      글번호 = ((await 응답.json()) as { id: number }).id;
      await verify('글이 만들어진다', 응답.status(), 201);
    });

    await test.step('직접 만든 창에서 모킹을 받는다', async () => {
      const 브라우저 = page.context().browser();
      if (브라우저 === null) throw new Error('브라우저가 없다');
      const 창 = await 브라우저.newContext();
      const 응답 = await 창.request.get('/api/mocked');
      await verify('모킹 응답이 온다', await 응답.text(), '{"모킹":true}');
      await 창.close();
    });
  } finally {
    if (글번호 !== undefined) await 연결.delete(`/api/posts/${글번호}`);
    await 연결.dispose();
  }
});
