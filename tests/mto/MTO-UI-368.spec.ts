import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정게시물화면 } from './pages/account-statuses.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-368',
  name: '「계정 게시물 - @qa_user2」 화면에 필터 「모두」 · 「미디어 있음」과 게시물이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 게시 = new 계정게시물화면(page);
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

    await test.step('qa_user2 계정 상세에서 카운터 「게시물」을 누른다', async () => {
      await 상세.카운터링크('게시물').click();
      await 게시.그려질때까지();
      const 제목 = await verify('제목 「계정 게시물 - @qa_user2」가 보인다', await 게시.제목글(), '계정 게시물 - @qa_user2');
      const 모두 = await verify('필터 「모두」가 보인다', await 게시.필터모두.isVisible(), true);
      const 미디어 = await verify('필터 「미디어 있음」이 보인다', await 게시.필터미디어있음.isVisible(), true);
      const 게시물 = await verify('게시물이 보인다', await 게시.게시물행들.first().isVisible(), true);
      await verify('「계정 게시물 - @qa_user2」 화면에 필터 「모두」 · 「미디어 있음」과 게시물이 보인다', 제목 && 모두 && 미디어 && 게시물, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
