import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API, 내계정API, type 글 } from './helpers/api.helper.js';
import { 고정API, 고정풀기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-422',
  name: '고정 글이 5개가 되도록 고정하면 프로필에 고정 글 5개가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 상세 = new 글상세화면(page);
  const 글들: 글[] = [];
  const 글표식 = 표식('pin');
  let 아이디 = '';

  await test.step('두 번째 사용자로 로그인하고 새 글 여섯 개를 만든다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    아이디 = (await 내계정API(page)).acct;
    for (let 번째 = 1; 번째 <= 6; 번째 += 1) {
      글들.push(await 글쓰기API(page, { status: `고정 한도 확인 ${String(번째)} ${글표식}`, visibility: 'public' }));
    }
    await verify('새 글 여섯 개가 만들어졌다', 글들.length, 6, { blocker: true });
  });

  try {
    await test.step('두 번째 사용자 고정 글이 5개가 되도록 새 글을 고정한다', async () => {
      for (const 고정글 of 글들.slice(0, 4)) await 고정API(page, 고정글.id);
      const 다섯째 = 글들[4];
      if (다섯째 === undefined) throw new Error('다섯째 글이 없다');
      await 상세.열기(글경로(다섯째));
      await 상세.자세히열기();
      const 응답 = 상세.고정응답받기();
      await 상세.펼침.항목(/^고정$/).click();
      await 응답;
      await 프로필.열기(아이디);
      const 고정글 = 프로필.글(글표식).filter({ hasText: '고정됨' });
      await 고정글.first().waitFor();
      await 고정글.nth(4).waitFor({ timeout: 10_000 }).catch(() => undefined);
      await verify('고정 글이 5개가 되도록 고정하면 프로필에 고정 글 5개가 보인다', await 고정글.count(), 5);
    });

    await test.step('여섯째 글을 고정한다', async () => {
      const 여섯째 = 글들[5];
      if (여섯째 === undefined) throw new Error('여섯째 글이 없다');
      await 상세.열기(글경로(여섯째));
      await 상세.자세히열기();
      await 상세.펼침.항목(/^고정$/).click();
      const 떴다 = await 상세.알림.글('이미 너무 많은 게시물을 고정했습니다').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('여섯째 고정에는 「이미 너무 많은 게시물을 고정했습니다」가 보인다', 떴다, true);
    });
  } finally {
    for (const 고정글 of 글들) {
      await 고정풀기API(page, 고정글.id);
      await 글지우기API(page, 고정글.id);
    }
  }
});
