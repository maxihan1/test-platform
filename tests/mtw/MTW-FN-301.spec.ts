import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { BrowserContext } from '@playwright/test';

import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기, 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-301',
  name: '홈을 아래로 내린 채 새 글이 쌓이면 목록 위에 「1 개의 새 항목」 버튼이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 표 = 표식('new');
  const 창묶음목록: BrowserContext[] = [];
  const 글지우기목록: Array<() => Promise<void>> = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('홈을 연다', async () => {
      await 홈.열기();
      await verify('홈에 작성 상자가 보인다', await 홈.작성.영역.isVisible(), true, { blocker: true });
    });

    await test.step('홈을 아래로 내린 채 다른 회원이 새 글을 올린다', async () => {
      await 홈.아래로내리기();
      const 다른회원 = await 새창열기(page);
      창묶음목록.push(다른회원.창묶음);
      await 로그인하기(다른회원.page, params.secondId, params.secondPassword);
      const 쓴글 = await 글쓰기API(다른회원.page, { status: `새 글 알림 확인 ${표}`, visibility: 'public' });
      글지우기목록.push(() => 글지우기API(다른회원.page, 쓴글.id));
      const 보인다 = await 홈.새항목버튼.waitFor({ timeout: 15_000 }).then(() => true, () => false);
      await verify('홈을 아래로 내린 채 새 글이 쌓이면 목록 위에 「1 개의 새 항목」 버튼이 보인다', 보인다, true);
    });
  } finally {
    for (const 지우기 of 글지우기목록) await 지우기();
    for (const 창묶음 of 창묶음목록) await 창묶음.close();
  }
});
