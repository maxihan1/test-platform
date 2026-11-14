import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API, 글찾기API } from './helpers/api.helper.js';
import { 글상태API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 작성화면 } from './pages/publish.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-388',
  name: '팔로워만 글에 답장하면 작성 상자 공개 범위가 「팔로워」로 잡힌다',
  precondition: ['일반 회원이 쓴 팔로워만 글이 있다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  const 글쓰기 = new 작성화면(page);
  const 글표식 = 표식('reply');
  let 글번호: string | undefined;
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 팔로워만 글의 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `팔로워만 글 ${글표식}`, visibility: 'private' });
    글번호 = 글.id;
    경로 = 글경로(글);
    await 상세.열기(경로);
    await verify('팔로워만 글 상세에 본문이 보인다', await 상세.본문조각(글표식).isVisible(), true, { blocker: true });
  });

  try {
    await test.step('내 팔로워만 글의 「답장」을 누른다', async () => {
      await 상세.답장.click();
      await 글쓰기.답장취소.waitFor();
      await verify('팔로워만 글에 답장하면 작성 상자 공개 범위가 「팔로워」로 잡힌다', await 글쓰기.공개범위버튼('팔로워').isVisible(), true);
    });

    await test.step('seoyeon_books 의 내용 경고 글에 「답장」을 누른다', async () => {
      const 경고글 = await 글찾기API(page, 'seoyeon_books', '범인은 처음부터');
      const 원래경고 = (await 글상태API(page, 경고글.id)).spoiler_text;
      await 상세.열기(글경로(경고글));
      await 상세.답장.click();
      await 글쓰기.답장취소.waitFor();
      await verify('내용 경고 글의 답장에는 같은 경고 문구가 복사된다', await 글쓰기.작성.경고칸.inputValue(), 원래경고);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
