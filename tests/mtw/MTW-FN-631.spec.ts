import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { BrowserContext } from '@playwright/test';

import { apiPost, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기, 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-631',
  name: '해시태그를 팔로우한 뒤 그 태그 공개 글이 올라오면 홈에 그 글이 보인다',
  precondition: ['관리자가 쓸 새 해시태그를 일반 회원이 팔로우했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 태그 = 표식('htag');
  const 본문표식 = 표식('post');
  let 팔로우했다 = false;
  let 글번호: string | undefined;
  const 관리자창묶음: BrowserContext[] = [];
  const 관리자글지우기: Array<() => Promise<void>> = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('일반 회원이 새 해시태그를 팔로우한다', async () => {
      const 응답 = await apiPost(page, `/api/v1/tags/${태그}/follow`);
      팔로우했다 = 응답.ok();
    });

    await test.step('새 해시태그를 팔로우한 것을 확인한다', async () => {
      await verify('일반 회원이 새 해시태그를 팔로우했다', 팔로우했다, true, { blocker: true });
    });

    await test.step('관리자가 그 해시태그를 단 공개 글을 쓴다', async () => {
      const 관리자 = await 새창열기(page);
      관리자창묶음.push(관리자.창묶음);
      await 로그인하기(관리자.page, params.adminId, params.adminPassword);
      const 쓴글 = await 글쓰기API(관리자.page, { status: `${본문표식} #${태그}`, visibility: 'public' });
      글번호 = 쓴글.id;
      관리자글지우기.push(() => 글지우기API(관리자.page, 쓴글.id));
    });

    await test.step('관리자가 그 해시태그를 단 공개 글을 쓴 뒤 일반 회원 홈을 연다', async () => {
      await 홈.열기();
      const 보인다 = await 홈.글(본문표식).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('해시태그를 팔로우한 뒤 그 태그 공개 글이 올라오면 홈에 그 글이 보인다', 보인다, true);
    });
  } finally {
    if (글번호 !== undefined) for (const 지우기 of 관리자글지우기) await 지우기();
    for (const 창묶음 of 관리자창묶음) await 창묶음.close();
    if (팔로우했다) await apiPost(page, `/api/v1/tags/${태그}/unfollow`);
  }
});
