import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 글목록읽기 } from './helpers/board.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-044',
  name: '「질문」 탭을 누르면 공지를 뺀 글이 모두 분류 「질문」 이다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 「질문」 탭을 누른다', async () => {
    await 목록.탭누르기('질문');
    const 분류들 = (await 목록.일반행읽기()).map((행) => 행.분류);
    await verify('「질문」 탭을 누르면 공지를 뺀 글이 모두 분류 「질문」 이다', { 글수: 분류들.length > 0, 분류: [...new Set(분류들)] }, { 글수: true, 분류: ['질문'] });
    await verify(
      '「질문」 탭에서도 공지글이 맨 위에 「공지」 표시와 함께 보인다',
      { 공지글: (await 목록.공지행들.count()) > 0, 첫행표시: await 목록.첫행공지표시() },
      { 공지글: true, 첫행표시: '공지' },
    );
  });

  await test.step('검색 조건을 「작성자」 로 고르고 작성자 이름으로 검색한다', async () => {
    await 목록.열기();
    const 이름 = (await 글목록읽기(request, { size: 1 })).items[0]?.author ?? '';
    await 목록.검색하기(이름, '작성자');
    const 작성자들 = (await 목록.일반행읽기()).map((행) => 행.작성자);
    await verify(
      '검색 조건 「작성자」 로 검색하면 그 작성자의 글만 보인다',
      { 글수: 작성자들.length > 0, 작성자: [...new Set(작성자들)] },
      { 글수: true, 작성자: [이름] },
    );
  });

  await test.step('정렬을 「조회순」 으로 고른다', async () => {
    await 목록.열기();
    await 목록.정렬고르기('조회순');
    const 조회수들 = (await 목록.일반행읽기()).map((행) => Number(행.조회수));
    await verify(
      '정렬을 「조회순」 으로 고르면 조회수가 많은 글부터 보인다',
      { 글수: 조회수들.length > 1, 내림차순: 조회수들.every((값, 순서) => 순서 === 0 || 조회수들[순서 - 1] >= 값) },
      { 글수: true, 내림차순: true },
    );
  });

  let 바꾼제목들: string[] = [];
  let 바꾼주소 = '';

  await test.step('분류 · 검색 · 정렬 · 페이지를 바꾼다', async () => {
    await 목록.열기();
    await 목록.탭누르기('질문');
    await 목록.검색하기('입니다', '내용');
    await 목록.정렬고르기('조회순');
    await 목록.쪽누르기(2);
    const 값 = new URL(page.url()).searchParams;
    바꾼주소 = page.url();
    바꾼제목들 = await 목록.제목들읽기();
    await verify(
      '분류 · 검색 · 정렬 · 페이지를 바꾸면 주소창에 그 값이 남는다',
      { 분류: 값.get('category'), 검색어: 값.get('q'), 정렬: 값.get('sort'), 쪽: 값.get('page') },
      { 분류: '질문', 검색어: '입니다', 정렬: 'views', 쪽: '2' },
    );
  });

  await test.step('바꾼 목록을 새로 고친다', async () => {
    await page.reload();
    await 목록.불러오기기다리기();
    await verify(
      '바꾼 목록을 새로 고쳐도 같은 목록이 보인다',
      { 주소: page.url(), 제목들: await 목록.제목들읽기(), 현재쪽: await 목록.현재쪽.innerText() },
      { 주소: 바꾼주소, 제목들: 바꾼제목들, 현재쪽: '2' },
    );
  });

  await test.step('다른 분류로 바꾼 뒤 뒤로 가기를 한다', async () => {
    await 목록.탭누르기('후기');
    await page.goBack();
    await 목록.선택된탭('질문').waitFor();
    await 목록.불러오기기다리기();
    await verify(
      '뒤로 가기를 하면 바꾸기 전 목록이 보인다',
      { 주소: page.url(), 제목들: await 목록.제목들읽기() },
      { 주소: 바꾼주소, 제목들: 바꾼제목들 },
    );
  });
});
