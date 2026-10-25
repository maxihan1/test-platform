import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기, 홈공지팝업껐다켜기 } from './helpers/users-flow.helper.js';
import { 변경기록화면 } from './pages/audit.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-337',
  name: '홈 공지 팝업 스위치를 바꿔도 변경 기록에 새 줄이 생기지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 변경 = new 변경기록화면(page);
  let 이전줄수 = 0;

  await test.step('관리자 계정으로 로그인해 있고 변경 기록의 「홈 공지 팝업」 줄 수를 읽어 둔다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 변경.열기();
    await 변경.검색하기('홈 공지 팝업');
    이전줄수 = await 변경.줄들.count();
    await verify('변경 기록 화면이 보인다', await 변경.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「홈 공지 팝업」 스위치를 껐다 켠 뒤 변경 기록에서 「홈 공지 팝업」을 찾는다', async () => {
    await 홈공지팝업껐다켜기(page);
    await 변경.열기();
    await 변경.검색하기('홈 공지 팝업');
    await verify('홈 공지 팝업 스위치를 바꿔도 변경 기록에 새 줄이 생기지 않는다', await 변경.줄들.count(), 이전줄수);
  });
});
