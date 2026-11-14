import { 계정창열기 } from './helpers/account-api.helper.js';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글지우기API, 글찾기API } from './helpers/api.helper.js';
import { 투표글쓰기API, 투표참여API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-837',
  name: '마감된 투표 글을 열면 「투표」 버튼 없이 「마감」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다', '일반 회원이 쓴 투표 글이 있다', '두 번째 사용자가 쓴 투표 글에 일반 회원이 참여했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 상세 = new 글상세화면(page);
  const 내표식 = 표식('mypoll');
  const 남표식 = 표식('otherpoll');
  let 내글번호: string | undefined;
  let 내경로 = '';

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('minjun_dev 의 마감된 투표 글을 연다', async () => {
      const 글 = await 글찾기API(page, 'minjun_dev', '지난주 스터디 주제 투표');
      await 상세.열기(글경로(글));
      const 마감 = await verify('「마감」이 보인다', await 상세.투표마감기다리기(), true);
      const 버튼 = await verify('「투표」 버튼이 없다', await 상세.투표버튼.count(), 0);
      await verify('마감된 투표 글을 열면 「투표」 버튼 없이 「마감」이 보인다', 마감 && 버튼, true);
    });

    await test.step('내 투표 글을 연다', async () => {
      const 내글 = await 투표글쓰기API(page, `내 투표 글 ${내표식}`);
      내글번호 = 내글.id;
      내경로 = 글경로(내글);
      await 상세.열기(내경로);
      await verify('내가 만든 투표 글에는 「투표」 버튼이 없다', await 상세.투표버튼.count(), 0);
    });

    await test.step('참여한 투표 글을 연다', async () => {
      const 창 = await 계정창열기(page, params.secondId, params.secondPassword);
      let 남글번호: string | undefined;
      try {
        const 남글 = await 투표글쓰기API(창.page, `남의 투표 글 ${남표식}`);
        남글번호 = 남글.id;
        await 투표참여API(page, 남글.pollId, 0);
        await 상세.열기(글경로(남글));
        const 표시 = await verify('「이 답변에 투표함」이 보인다', await 상세.투표함표시.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
        const 버튼 = await verify('「투표」 버튼이 없다', await 상세.투표버튼.count(), 0);
        await verify('이미 참여한 투표에는 「이 답변에 투표함」이 보이고 「투표」 버튼이 없다', 표시 && 버튼, true);
      } finally {
        if (남글번호 !== undefined) await 글지우기API(창.page, 남글번호);
        await 창.창묶음.close();
      }
    });
  } finally {
    if (내글번호 !== undefined) await 글지우기API(page, 내글번호);
  }
});
