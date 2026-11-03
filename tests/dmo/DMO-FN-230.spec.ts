import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 공지숨길등록, 공지찾기, 글자수맞추기, 임의글자, 정리함 } from './helpers/board-flow.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-230',
  name: '공지 본문을 9자로 등록하면 창이 열린 채 공지가 등록되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 「공지 쓰기」 창이 열려 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    contentShort: z.number().int().describe('등록되지 않는 본문 글자 수 — 1~9자').default(9),
    contentMin: z.number().int().describe('등록되는 본문 글자 수 — 10~2000자').default(10),
    contentMax: z.number().int().describe('등록되는 가장 긴 본문 글자 수 — 10~2000자').default(2000),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);
  const 짧은제목 = `시험공지 ${임의글자(8)}`;
  const 최소제목 = `시험공지 ${임의글자(8)}`;
  const 최대제목 = `시험공지 ${임의글자(8)}`;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 운영게시판화면.주소);
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('「공지 쓰기」 창을 연다', async () => {
      await 화면.공지창열기();
    });

    await test.step('「공지 쓰기」 창을 확인한다', async () => {
      await verify('「공지 쓰기」 창에 본문 칸이 보인다', await 화면.본문칸.isVisible(), true, { blocker: true });
    });

    await test.step('본문에 9자를 적고 「등록」을 누른다', async () => {
      공지숨길등록(page, 짧은제목, 정리);
      await 화면.공지적기(짧은제목, 글자수맞추기(params.contentShort));
      await 화면.등록누르고안내기다리기();
      const 열림 = await verify('창이 열려 있다', await 화면.창.isVisible(), true);
      const 없음 = await verify('공지가 등록되지 않았다', (await 공지찾기(page, 짧은제목)).length, 0);
      await verify('공지 본문을 9자로 등록하면 창이 열린 채 공지가 등록되지 않는다', 열림 && 없음, true);
    });

    await test.step('본문에 10자를 적고 「등록」을 누른다', async () => {
      공지숨길등록(page, 최소제목, 정리);
      await 화면.공지창열기();
      await 화면.공지적기(최소제목, 글자수맞추기(params.contentMin));
      await 화면.등록누르고응답기다리기();
      await 화면.열기();
      await verify('공지 본문을 10자로 등록하면 게시판 목록에 그 공지가 보인다', await 화면.제목링크(최소제목).isVisible(), true);
    });

    await test.step('본문에 2000자를 적고 「등록」을 누른다', async () => {
      공지숨길등록(page, 최대제목, 정리);
      await 화면.공지창열기();
      await 화면.공지적기(최대제목, 글자수맞추기(params.contentMax));
      await 화면.등록누르고응답기다리기();
      await 화면.열기();
      await verify('공지 본문을 2000자로 등록하면 게시판 목록에 그 공지가 보인다', await 화면.제목링크(최대제목).isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
