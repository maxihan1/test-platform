import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단없는리모트계정 } from './helpers/account.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-053',
  name: '리모트 계정 상세 정보 표에 「수신함 URL」 · 「공유된 inbox URL」과 「도메인 차단 추가하기」 링크가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '도메인 차단이 없는 리모트 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);
  const 상세 = new 계정상세화면(page);
  let 아이디 = '';

  await test.step('Owner 계정으로 로그인하고 도메인 차단이 없는 리모트 계정을 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    아이디 = await 도메인차단없는리모트계정(page);
    await verify('도메인 차단이 없는 리모트 계정이 있다', 아이디 !== '', true, { blocker: true });
  });

  await test.step('도메인 차단이 없는 리모트 계정 상세를 연다', async () => {
    await 목록.열기('origin=remote');
    await 목록.계정이름링크(아이디).click();
    await 상세.카운터.waitFor();
    const 수신함 = await verify('「수신함 URL」이 보인다', await 상세.정보줄('수신함 URL').isVisible(), true);
    const 공유 = await verify('「공유된 inbox URL」이 보인다', await 상세.정보줄('공유된 inbox URL').isVisible(), true);
    const 링크 = await verify('「도메인 차단 추가하기」 링크가 보인다', await 상세.도메인차단추가하기.isVisible(), true);
    await verify('리모트 계정 상세 정보 표에 「수신함 URL」 · 「공유된 inbox URL」과 「도메인 차단 추가하기」 링크가 보인다', 수신함 && 공유 && 링크, true);
  });
});
