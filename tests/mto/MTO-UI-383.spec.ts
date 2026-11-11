import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그목록화면 } from './pages/tags.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-383',
  name: '해시태그 목록에 「관리」 선택 · 「정렬」 「최신」 · 「오래된 순」 · 「이름」 칸 · 「검색」 · 「초기화」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 목록 = new 해시태그목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「해시태그」 화면을 연다', async () => {
    await 목록.열기();
    const 관리선택 = await verify('「관리」 선택이 보인다', await 목록.관리선택.isVisible(), true);
    const 정렬 = await verify('「정렬」에 「최신」 · 「오래된 순」이 보인다', (await 목록.정렬항목들.allInnerTexts()).map((t) => t.trim()).join(', '), '최신, 오래된 순');
    const 이름 = await verify('「이름」 칸이 보인다', await 목록.이름칸.isVisible(), true);
    const 검색 = await verify('「검색」이 보인다', await 목록.검색.isVisible(), true);
    const 초기화 = await verify('「초기화」가 보인다', await 목록.초기화.isVisible(), true);
    await verify('해시태그 목록에 「관리」 선택 · 「정렬」 「최신」 · 「오래된 순」 · 「이름」 칸 · 「검색」 · 「초기화」가 보인다', 관리선택 && 정렬 && 이름 && 검색 && 초기화, true);
  });
});
