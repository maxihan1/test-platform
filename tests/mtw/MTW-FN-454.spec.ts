import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-454',
  name: '내 팔로워만 글의 부스트 아이콘을 누르면 「팔로워들에게 다시 공유」가 보인다',
  precondition: ['일반 회원이 쓴 팔로워만 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  const 글표식 = 표식('priv');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 팔로워만 글의 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `팔로워만 부스트 확인 ${글표식}`, visibility: 'private' });
    글번호 = 글.id;
    await 상세.열기(글경로(글));
    await verify('팔로워만 글 상세에 본문이 보인다', await 상세.본문조각(글표식).isVisible(), true, { blocker: true });
  });

  try {
    await test.step('내 팔로워만 글의 부스트 아이콘을 누른다', async () => {
      await 상세.부스트.click();
      const 떴다 = await 상세.펼침.항목('팔로워들에게 다시 공유').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('내 팔로워만 글의 부스트 아이콘을 누르면 「팔로워들에게 다시 공유」가 보인다', 떴다, true);
      await verify('내 팔로워만 글은 「인용」도 누를 수 있다', await 상세.펼침.항목('인용').isEnabled(), true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
