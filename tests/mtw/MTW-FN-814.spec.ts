import { 계정창열기 } from './helpers/account-api.helper.js';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식, type 새창 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-814',
  name: '팔로워만 글을 게시하면 나를 팔로우하지 않는 관리자는 그 글을 볼 수 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글표식 = 표식('fol');
  let 글번호: string | undefined;
  let 경로 = '';
  let 둘째창: 새창 | undefined;

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('팔로워만 글을 게시한다', async () => {
      const 글 = await 글쓰기API(page, { status: `팔로워만 글 확인 ${글표식}`, visibility: 'private' });
      글번호 = 글.id;
      경로 = 글경로(글);
      const 창 = await 계정창열기(page, params.adminId, params.adminPassword);
      try {
        const 관리자상세 = new 글상세화면(창.page);
        await verify('팔로워만 글을 게시하면 나를 팔로우하지 않는 관리자는 그 글을 볼 수 없다', await 관리자상세.열고본문기다리기(경로, 글표식), false);
      } finally {
        await 창.창묶음.close();
      }
    });

    await test.step('두 번째 사용자로 그 글 주소를 연다', async () => {
      둘째창 = await 계정창열기(page, params.secondId, params.secondPassword);
      const 둘째상세 = new 글상세화면(둘째창.page);
      await verify('팔로워인 두 번째 사용자는 그 글을 본다', await 둘째상세.열고본문기다리기(경로, 글표식), true);
    });

    await test.step('두 번째 사용자로 그 글의 부스트 메뉴를 연다', async () => {
      if (둘째창 === undefined) throw new Error('두 번째 사용자 창이 없다');
      const 둘째상세 = new 글상세화면(둘째창.page);
      await 둘째상세.부스트메뉴열기();
      await verify('두 번째 사용자에게는 그 글의 부스트가 막혀 있다', await 둘째상세.부스트.isDisabled(), true);
    });
  } finally {
    if (둘째창 !== undefined) await 둘째창.창묶음.close();
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
