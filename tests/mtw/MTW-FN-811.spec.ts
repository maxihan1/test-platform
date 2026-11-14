import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기API, 글지우기API, 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 이서버타임라인화면 } from './pages/local-timeline.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 태그타임라인화면 } from './pages/tag-timeline.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-811',
  name: '조용한 공개 글을 게시하면 실시간 피드 「이 서버」에 보이지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 이서버 = new 이서버타임라인화면(page);
  const 태그 = new 태그타임라인화면(page);
  const 프로필 = new 프로필화면(page);
  const 태그글자 = 표식('quiet');
  let 글번호: string | undefined;

  let 내아이디 = '';

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    내아이디 = (await 내계정API(page)).acct;
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('고유 해시태그를 단 조용한 공개 글을 게시한다', async () => {
      const 글 = await 글쓰기API(page, { status: `조용한 공개 글 확인 #${태그글자}`, visibility: 'unlisted' });
      글번호 = 글.id;
      await 이서버.열기();
      await verify('조용한 공개 글을 게시하면 실시간 피드 「이 서버」에 보이지 않는다', await 이서버.글(태그글자).count(), 0);
    });

    await test.step('그 해시태그 화면을 연다', async () => {
      await 태그.열기(태그글자);
      await verify('조용한 공개 글은 해시태그 화면에도 보이지 않는다', await 태그.글(태그글자).count(), 0);
    });

    await test.step('내 프로필을 연다', async () => {
      await 프로필.열기(내아이디);
      const 보인다 = await 프로필.글(태그글자).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('조용한 공개 글은 내 프로필에는 보인다', 보인다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
