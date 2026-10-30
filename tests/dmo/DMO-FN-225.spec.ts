import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 댓글만들기, 정리함, 회원마당열기, type 만든글, type 만든댓글 } from './helpers/board-flow.helper.js';
import { 댓글숨기기 } from './helpers/ops-data.helper.js';
import { 커뮤니티글화면 } from './pages/community-post.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-225',
  name: '숨긴 댓글에는 쓴 회원에게도 「수정」 · 「삭제」가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원 글에 그 회원이 쓴 댓글을 관리자가 숨겼다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 틀 = new 운영틀(page);
  let 글: 만든글;
  let 숨길댓글: 만든댓글;
  let 남길댓글: 만든댓글;
  let 회원글화면: 커뮤니티글화면;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 글을 쓰고 댓글 두 개를 단 뒤 관리자가 댓글 하나를 숨긴다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      글 = await 글만들기(마당, page, 정리);
      숨길댓글 = await 댓글만들기(마당, 글.id, '시험 댓글 하나');
      남길댓글 = await 댓글만들기(마당, 글.id, '시험 댓글 둘');
      await 댓글숨기기(page, 숨길댓글.id, true);
      회원글화면 = new 커뮤니티글화면(마당.창);
    });

    await test.step('그 회원으로 글 상세를 연다', async () => {
      await 회원글화면.열기(글.id);
      await 회원글화면.댓글그려질때까지();
      const 남긴줄 = 회원글화면.댓글줄(남길댓글.content);
      const 수정 = await verify('숨기지 않은 댓글에는 「수정」이 보인다', await 남긴줄.getByRole('button', { name: '수정', exact: true }).isVisible(), true, { blocker: true });
      const 삭제 = await verify('숨기지 않은 댓글에는 「삭제」가 보인다', await 남긴줄.getByRole('button', { name: '삭제', exact: true }).isVisible(), true, { blocker: true });
      await verify('숨긴 댓글이 자리를 지키고 있다', 수정 && 삭제 && (await 회원글화면.숨긴댓글줄.isVisible()), true, { blocker: true });
      const 수정없음 = await verify('숨긴 댓글에는 「수정」이 보이지 않는다', await 회원글화면.숨긴댓글줄.getByRole('button', { name: '수정', exact: true }).isVisible(), false);
      const 삭제없음 = await verify('숨긴 댓글에는 「삭제」가 보이지 않는다', await 회원글화면.숨긴댓글줄.getByRole('button', { name: '삭제', exact: true }).isVisible(), false);
      await verify('숨긴 댓글에는 쓴 회원에게도 「수정」 · 「삭제」가 보이지 않는다', 수정없음 && 삭제없음, true);
    });
  } finally {
    await 정리.비우기();
  }
});
