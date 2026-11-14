import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기, 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 이서버타임라인화면 } from './pages/local-timeline.page.js';
import { 글상세화면 } from './pages/status.page.js';
import { 태그타임라인화면 } from './pages/tag-timeline.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-808',
  name: '공개 글을 게시하면 비회원도 그 글 상세를 볼 수 있다',
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
  const 태그글자 = 표식('pub');
  let 글번호: string | undefined;
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('고유 해시태그를 단 공개 글을 게시한다', async () => {
      await 홈.작성.쓰기(`공개 글 확인 #${태그글자}`);
      const 게시 = await 홈.작성.게시하기();
      글번호 = 게시.id;
      경로 = 글경로(게시);
      const 창 = await 새창열기(page);
      try {
        const 비회원상세 = new 글상세화면(창.page);
        await verify('공개 글을 게시하면 비회원도 그 글 상세를 볼 수 있다', await 비회원상세.열고본문기다리기(경로, 태그글자), true);
      } finally {
        await 창.창묶음.close();
      }
    });

    await test.step('실시간 피드 「이 서버」를 연다', async () => {
      await 이서버.열기();
      const 보인다 = await 이서버.글(태그글자).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('공개 글은 실시간 피드 「이 서버」에 보인다', 보인다, true);
    });

    await test.step('그 해시태그 화면을 연다', async () => {
      await 태그.열기(태그글자);
      const 보인다 = await 태그.글(태그글자).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('공개 글은 그 해시태그 화면에 보인다', 보인다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
