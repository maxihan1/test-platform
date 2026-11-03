import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 공지숨길등록, 공지찾기, 글자수맞추기, 임의글자, 정리함 } from './helpers/board-flow.helper.js';
import { 커뮤니티목록화면 } from './pages/community.page.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-235',
  name: '공지를 등록하면 커뮤니티 목록 맨 위 공지 줄에 그 공지가 관리자 이름으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 「공지 쓰기」 창이 열려 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 운영게시판화면(page);
  const 목록 = new 커뮤니티목록화면(page);
  const 틀 = new 운영틀(page);
  const 제목 = `시험공지 ${임의글자(8)}`;
  let 관리자이름 = '';
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 운영게시판화면.주소);
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
      await 틀.관리자이름.filter({ hasText: /\(.+\)/ }).waitFor();
      관리자이름 = (await 틀.관리자이름.innerText()).replace(/\s*\(.*\)\s*$/, '').trim();
    });

    await test.step('「공지 쓰기」 창을 연다', async () => {
      await 화면.공지창열기();
    });

    await test.step('「공지 쓰기」 창을 확인한다', async () => {
      await verify('「공지 쓰기」 창에 제목 칸이 보인다', await 화면.제목칸.isVisible(), true, { blocker: true });
    });

    await test.step('제목과 본문을 적고 「등록」을 누른 뒤 커뮤니티 목록을 연다', async () => {
      공지숨길등록(page, 제목, 정리);
      await 화면.공지적기(제목, 글자수맞추기(20));
      await 화면.등록누르고응답기다리기();
      const [내공지] = await 공지찾기(page, 제목);
      await 목록.열기();
      const 번호들 = await 목록.공지번호들();
      const 내위치 = 번호들.indexOf(내공지.id);
      const 위쪽 = 번호들.slice(0, Math.max(내위치, 0));
      const 공지 = await verify('맨 위 공지 줄에 그 공지가 보인다', 내위치 >= 0 && 위쪽.every((번호) => 번호 > 내공지.id), true);
      const 이름 = await verify('맨 위 공지 줄에 관리자 이름이 보인다', await 목록.공지줄(제목).getByRole('cell', { name: 관리자이름, exact: true }).isVisible(), true);
      await verify('공지를 등록하면 커뮤니티 목록 맨 위 공지 줄에 그 공지가 관리자 이름으로 보인다', 공지 && 이름, true);
    });
  } finally {
    await 정리.비우기();
  }
});
