import { defineCase, test, verify } from '@platform/kit';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-UI-029',
  name: '할 일 화면에 제목 · 입력칸 · 바닥글 안내가 보인다',
  precondition: ['할 일 목록이 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 연다', async () => {
    await 화면.열기();
    await verify('할 일 화면에 제목 「todos」가 보인다', await 화면.제목.isVisible(), true);
    await verify('할 일 화면에 입력칸 「What needs to be done?」가 보인다', await 화면.입력칸.isVisible(), true);
    await verify('할 일 화면 바닥글에 「Double-click to edit a todo」가 보인다', await 화면.바닥글안내.isVisible(), true);
  });
});
