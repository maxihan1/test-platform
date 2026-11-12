import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정관계화면 } from './pages/account-relationships.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-371',
  name: '계정 상세에서 「팔로워」를 누르면 「qa_user2의 관계」 화면에 「위치」 필터가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 관계 = new 계정관계화면(page);
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('qa_user2 계정 상세에서 카운터 「팔로워」를 누른다', async () => {
      await 상세.카운터링크('팔로워').click();
      await 관계.관계필터.waitFor();
      const 제목 = await verify('「qa_user2의 관계」 화면이 열린다', await 관계.제목글(), 'qa_user2의 관계');
      const 필터 = await verify('「위치」 필터가 보인다', await 관계.위치필터.isVisible(), true);
      await verify('계정 상세에서 「팔로워」를 누르면 「qa_user2의 관계」 화면에 「위치」 필터가 보인다', 제목 && 필터, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
