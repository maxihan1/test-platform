import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-382',
  name: '지도 틀의 「확대」를 누르면 배율 숫자가 1 오른다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 고객 = new 고객센터화면(page);

  await test.step('고객센터 화면을 연다', async () => {
    await 안내창끄기(page);
    await 고객.열기();
    await verify('비회원이다', await 고객.머리글.로그인링크.isVisible(), true, { blocker: true });
    await 고객.배율.waitFor();
  });

  await test.step('지도 틀 안의 「확대」를 누른다', async () => {
    const 이전 = await 고객.배율숫자();
    await 고객.확대버튼.click();
    await verify('지도 틀의 「확대」를 누르면 배율 숫자가 1 오른다', (await 고객.배율숫자()) - 이전, 1);
  });

  await test.step('지도 틀 안의 「축소」를 누른다', async () => {
    const 이전 = await 고객.배율숫자();
    await 고객.축소버튼.click();
    await verify('「축소」를 누르면 배율 숫자가 1 내려간다', (await 고객.배율숫자()) - 이전, -1);
  });
});
