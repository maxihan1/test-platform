import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 글이될때까지읽기, 목록만들기, 목록지우기 } from './helpers/settings-flow.helper.js';
import { 확인창 } from './components/dialog.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-428',
  name: '구성원 목록에서 구성원을 고르고 「제거」를 누르면 「구성원을 제거하시겠습니까?」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    구성원: z.string().min(1).describe('신규 목록에 더할 구성원 사용자명 — 내가 팔로우하는 계정').default('minjun_dev'),
  }),
  expected: z.object({
    묻는글: z.string().describe('제거 확인 창 질문').default('구성원을 제거하시겠습니까?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  const 창 = new 확인창(driver);
  const 이름 = 표시글('목록');
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('신규 목록 하나를 만든다', async () => {
      await verify('신규 목록이 만들어진다', await 목록만들기(driver, 이름), true, { blocker: true });
    });
    await test.step('신규 목록에 구성원 하나를 더한다', async () => {
      await 홈.목록고르기(이름);
      await 뜰때까지(driver, 홈.목록관리, 15_000);
      await driver.$(홈.목록관리).click();
      await verify('목록 편집 화면이 열린다', await 목록.편집그려질때까지(), true, { blocker: true });
      await driver.$(목록.편집줄('리스트 구성원')).click();
      await verify('리스트 구성원 화면의 구성원 추가 버튼이 보인다', await 뜰때까지(driver, 목록.구성원추가, 15_000), true, { blocker: true });
      await driver.$(목록.구성원추가).click();
      await verify('구성원 검색 칸이 보인다', await 뜰때까지(driver, 목록.검색칸, 15_000), true, { blocker: true });
      await 칸에적기(await driver.$(목록.검색칸).getElement(), params.구성원);
      await verify('검색 결과에 구성원이 보인다', await 뜰때까지(driver, 목록.계정(params.구성원), 10_000), true, { blocker: true });
      await driver.$(목록.행버튼).click();
      await driver.back();
      await verify('구성원 목록에 구성원이 보인다', await 뜰때까지(driver, 목록.계정(params.구성원), 15_000), true, { blocker: true });
    });
    await test.step('새 목록 구성원 목록에서 고르고 「제거」를 누른다', async () => {
      await driver.$(목록.편집더보기).click();
      await 홈.메뉴.고르기('선택');
      await driver.$(목록.계정(params.구성원)).click();
      await verify('구성원이 골라져 선택 막대가 보인다', await 뜰때까지(driver, 목록.선택제목, 10_000), true, { blocker: true });
      await driver.$(목록.선택삭제).click();
      await verify('구성원 목록에서 구성원을 고르고 「제거」를 누르면 「구성원을 제거하시겠습니까?」가 보인다', await 글이될때까지읽기(driver, 창.제목, expected.묻는글), expected.묻는글);
      await 창.취소();
    });
  } finally {
    await 목록지우기(driver, 이름);
  }
});
