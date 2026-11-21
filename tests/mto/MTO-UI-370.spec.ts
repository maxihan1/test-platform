import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 신고닫기 } from './helpers/account.helper.js';
import { 계정번호, 신고만들기 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정컬렉션화면 } from './pages/account-collections.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-370',
  name: '「계정 컬렉션 - @qa_user1」 화면에 「신고 #N에 추가」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '컬렉션이 있는 qa_user1 을 케이스가 신고해 두었다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 컬렉션 = new 계정컬렉션화면(page);
  let 신고번호 = '';

  try {
    await test.step('중재자 창으로 qa_user1 신고를 만든다', async () => {
      const 신고자 = await 새창으로로그인(page, params.modId, params.modPassword);
      try {
        신고번호 = await 신고만들기(신고자, 'qa_user1', { 게시물: '없음' });
      } finally {
        await 신고자.context().close();
      }
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(신고번호);
      await verify('컬렉션이 있는 qa_user1 을 케이스가 신고해 두었다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('신고에 연결된 qa_user1 의 컬렉션 주소를 연다', async () => {
      await 컬렉션.열기(await 계정번호(page, 'qa_user1'), 신고번호);
      const 제목 = await verify('「계정 컬렉션 - @qa_user1」 화면이 열린다', await 컬렉션.제목글(), '계정 컬렉션 - @qa_user1');
      const 추가 = await verify('「신고 #N에 추가」가 보인다', await 컬렉션.신고에추가.isVisible(), true);
      await verify('「계정 컬렉션 - @qa_user1」 화면에 「신고 #N에 추가」가 보인다', 제목 && 추가, true);
    });
  } finally {
    if (신고번호) await 신고닫기(page, 신고번호);
  }
});
