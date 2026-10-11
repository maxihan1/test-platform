import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-047',
  name: '검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('검색어 1자로 검색한다', async () => {
    await 목록.검색어넣고누르기('가');
    await 알림.모두.first().waitFor();
    await verify('검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」 가 보인다', await 알림.모두.allInnerTexts(), ['검색어를 2자 이상 입력하세요']);
  });

  await test.step('검색어 2자로 검색한다', async () => {
    await 목록.열기();
    await 목록.검색하기('후기');
    await verify(
      '검색어 2자로 검색하면 검색 결과 목록이 보이고 그 토스트는 뜨지 않는다',
      { 결과글: (await 목록.일반행들.count()) > 0, 그토스트: await 알림.글('검색어를 2자 이상 입력하세요').count() },
      { 결과글: true, 그토스트: 0 },
    );
  });
});
