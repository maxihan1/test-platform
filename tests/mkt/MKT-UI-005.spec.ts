import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-005',
  name: '화면 너비가 768px 이하면 머리글에 햄버거 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['화면 너비가 768px 이하다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('화면 너비를 768px 로 맞춘다', async () => {
    await 홈.화면너비를맞춘다(768);
  });

  await test.step('홈 화면을 연다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.열기();
    await 머리.로고.waitFor();
    await verify('화면 너비가 768px 이하면 머리글에 햄버거 버튼이 보인다', await 머리.햄버거.isVisible(), true);
  });
});
