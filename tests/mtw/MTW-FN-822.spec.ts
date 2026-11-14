import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 작성화면 } from './pages/publish.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-822',
  name: '게시한 글의 「수정」을 열면 공개 범위를 바꿀 수 없다',
  precondition: ['일반 회원이 쓴 새 글이 있다', '일반 회원이 쓴 팔로워만 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  const 글쓰기 = new 작성화면(page);
  const 공개표식 = 표식('pub');
  const 비공개표식 = 표식('priv');
  const 올린글: string[] = [];
  let 공개경로 = '';
  let 비공개경로 = '';

  await test.step('일반 회원으로 로그인하고 새 글과 팔로워만 글을 만든다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 공개 = await 글쓰기API(page, { status: `수정 화면 확인 ${공개표식}`, visibility: 'public' });
    const 비공개 = await 글쓰기API(page, { status: `팔로워만 인용 확인 ${비공개표식}`, visibility: 'private' });
    올린글.push(공개.id, 비공개.id);
    공개경로 = 글경로(공개);
    비공개경로 = 글경로(비공개);
    await verify('새 글 둘이 만들어졌다', 올린글.length, 2, { blocker: true });
  });

  try {
    await test.step('내 글의 「수정」을 연다', async () => {
      await 상세.열기(공개경로);
      await 상세.자세히열기();
      await 상세.펼침.항목(/^수정$/).click();
      await 글쓰기.답장취소.waitFor();
      await verify('게시한 글의 「수정」을 열면 공개 범위를 바꿀 수 없다', await 글쓰기.작성.공개범위.isDisabled(), true);
    });

    await test.step('내 팔로워만 글을 공개 글로 인용해 게시한다', async () => {
      await 상세.열기(비공개경로);
      await 상세.부스트.click();
      await 상세.펼침.항목(/^인용$/).click();
      await 글쓰기.인용취소.waitFor();
      await 글쓰기.공개범위창열기();
      const 떴다 = await 글쓰기.공개인용불가뜰때까지();
      await verify('「자신의 비공개 게시물을 공개 게시물로 인용할 수 없습니다.」 안내가 보인다', 떴다, true);
    });
  } finally {
    for (const 번호 of 올린글) await 글지우기API(page, 번호);
  }
});
