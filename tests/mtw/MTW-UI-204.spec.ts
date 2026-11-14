import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 리스트만들기화면 } from './pages/list-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-204',
  name: '리스트 만들기 화면에 「새 리스트 이름」 · 답글 포함 선택 · 「구성원을 홈에서 숨기기」 · 「만들기」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 리스트만들기화면(page);

  await test.step('일반 회원으로 로그인하고 리스트 만들기 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('리스트 만들기 화면에 「리스트 만들기」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  await test.step('리스트 만들기 화면을 연다', async () => {
    const 이름 = await verify('「새 리스트 이름」 칸이 보인다', await 화면.새이름라벨.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 답글 = await verify('답글 포함 선택이 보인다', await 화면.답글선택.isVisible(), true);
    const 숨기기 = await verify('「구성원을 홈에서 숨기기」가 보인다', await 화면.홈에서숨기기.isVisible(), true);
    const 만들기 = await verify('「만들기」가 보인다', await 화면.만들기.isVisible(), true);
    await verify('리스트 만들기 화면에 「새 리스트 이름」 · 답글 포함 선택 · 「구성원을 홈에서 숨기기」 · 「만들기」가 보인다', 이름 && 답글 && 숨기기 && 만들기, true);
  });
});
