import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { Page } from '@playwright/test';

import { 고유이름, 글쓰기, 글지우기 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그상세화면 } from './pages/tag-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-189',
  name: '해시태그 상세에서 「변경 사항을 저장」을 누르면 「해시태그 설정이 성공적으로 갱신되었습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 글로 만든 해시태그가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 상세 = new 해시태그상세화면(page);
  const 감사 = new 감사로그화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 이름 = 고유이름('mto');
  let 작성창: Page | undefined;
  let 글번호 = '';
  try {
    await test.step('qa_user1 창에서 새 해시태그가 든 글을 쓴다', async () => {
      작성창 = await 새창으로로그인(page, params.userId, params.userPassword);
      글번호 = await 글쓰기(작성창, `#${이름} 해시태그 시험`);
    });
    await test.step('Owner 창에서 그 해시태그 상세를 연다', async () => {
      await 상세.이름으로찾아열기(이름);
      await verify('케이스가 글로 만든 해시태그가 있다', (await 상세.제목.innerText()).trim(), `#${이름}`, { blocker: true });
    });
    await test.step('그 해시태그 상세에서 「변경 사항을 저장」을 누른다', async () => {
      await 상세.저장누르기();
      await verify('해시태그 상세에서 「변경 사항을 저장」을 누르면 「해시태그 설정이 성공적으로 갱신되었습니다」가 보인다', await 상세.알림.글('해시태그 설정이 성공적으로 갱신되었습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
    await test.step('해시태그를 저장한 뒤 「감사 로그」 화면을 연다', async () => {
      await 감사.열기();
      await verify('해시태그 저장 뒤 감사 로그 맨 위 줄에 그 해시태그 기록이 보인다', await 감사.맨위줄에글(`#${이름}`).isVisible(), true);
    });
  } finally {
    if (작성창 !== undefined) {
      if (글번호) await 글지우기(작성창, 글번호);
      await 작성창.context().close();
    }
  }
});
