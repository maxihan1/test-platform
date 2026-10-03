import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-009',
  name: '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
  platforms: ['desktop'],
  precondition: ['화면 너비가 768px 이하다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('화면 너비를 768px 로 맞추고 홈 화면을 연다', async () => {
    await 홈.화면너비를맞춘다(768);
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.열기();
    await 머리.햄버거.waitFor();
  });

  await test.step('메뉴가 닫혀 있는지 확인한다', async () => {
    const 상자 = await 머리.주메뉴.boundingBox();
    await verify('메뉴가 화면 왼쪽 밖에 있다', (상자?.x ?? 0) < 0, true, { blocker: true });
  });

  await test.step('머리글에서 햄버거 버튼을 누른다', async () => {
    await 머리.햄버거.click();
    await verify('햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다', await 홈.메뉴가나올때까지기다린다(), true);
  });
});
