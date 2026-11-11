import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-034',
  name: '계정 목록 화면에 필터 「위치」 · 「관리」 · 「역할」 · 「정렬」의 선택지와 검색 입력칸 넷, 「검색」 · 「초기화」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('「계정」 화면을 연다', async () => {
    await 목록.열기();
    const 위치 = await verify('「위치」 선택지가 「모두」 · 「로컬」 · 「리모트」다', await 목록.선택지글(목록.위치필터), '모두, 로컬, 리모트');
    const 관리 = await verify('「관리」 선택지가 「전체」 · 「활성」 · 「제한됨」 · 「비활성」 · 「정지」 · 「대기 중 (N)」다', await 목록.선택지글(목록.관리필터), '전체, 활성, 제한됨, 비활성, 정지, 대기 중 (N)');
    const 역할 = await verify('「역할」 선택지의 첫 항목이 「전체」다', (await 목록.선택지글(목록.역할필터)).split(', ')[0], '전체');
    const 정렬 = await verify('「정렬」 선택지가 「최신」 · 「최근 활동」이다', await 목록.선택지글(목록.정렬필터), '최신, 최근 활동');
    const 칸 = await verify('검색 입력칸이 넷 보인다', await 목록.검색칸들.count(), 4);
    const 검색 = await verify('「검색」 버튼이 보인다', await 목록.검색.isVisible(), true);
    const 초기화 = await verify('「초기화」 링크가 보인다', await 목록.초기화.isVisible(), true);
    await verify('계정 목록 화면에 필터 「위치」 · 「관리」 · 「역할」 · 「정렬」의 선택지와 검색 입력칸 넷, 「검색」 · 「초기화」가 보인다', 위치 && 관리 && 역할 && 정렬 && 칸 && 검색 && 초기화, true);
  });
});
