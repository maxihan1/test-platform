import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 상품읽기, 옵션상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-080',
  name: '세 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품읽기(request, 옵션상품번호);
  const 질문 = 상품.qna.map((q) => q.question);
  const 답변 = 상품.qna.map((q) => q.answer);

  await test.step('상품 상세 화면을 연다', async () => {
    await 방해막기(page);
    await 상세.열기(옵션상품번호);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('세 번째 썸네일에 마우스를 올린다', async () => {
    await 상세.썸네일에올리기(3);
    await verify('세 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다', await 상세.큰이미지주소(), await 상세.썸네일이미지주소(3));
  });

  await test.step('큰 이미지를 누른다', async () => {
    await 상세.열기(옵션상품번호);
    await 상세.확대열기();
    await verify(
      '큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다',
      { 보임: await 상세.확대창.isVisible(), 전체덮음: await 상세.확대창이화면을덮는가() },
      { 보임: true, 전체덮음: true },
    );
  });

  await test.step('확대 보기에서 → 키를 친다', async () => {
    const 이전 = await 상세.확대이미지번호();
    await page.keyboard.press('ArrowRight');
    await verify('확대 보기에서 → 키를 치면 다음 이미지로 넘어간다', await 상세.확대이미지번호(), 이전 + 1);
    await verify('확대 보기 위쪽 위치 표시가 「2 / 4」 로 바뀐다', await 상세.확대위치.innerText(), '2 / 4');
  });

  await test.step('확대 보기에서 ESC 를 친다', async () => {
    await page.keyboard.press('Escape');
    await page.locator('body:not(.no-scroll)').waitFor();
    await verify('확대 보기에서 ESC 를 치면 모달이 닫힌다', await 상세.확대창.isVisible(), false);
  });

  await test.step('수량 「+」 를 눌러 2로 만든다', async () => {
    await 상세.수량늘리기.click();
    const 판매가 = await 상세.금액읽기(상세.판매가);
    await verify('수량을 2로 바꾸면 「총 상품 금액」 이 판매가의 두 배로 바뀐다', await 상세.금액읽기(상세.총상품금액), 판매가 * 2);
  });

  await test.step('「상품 문의」 탭을 누른다', async () => {
    const 주소 = page.url();
    await 상세.탭('상품 문의').click();
    await verify(
      '「상품 문의」 탭을 누르면 내용만 바뀌고 주소는 그대로다',
      { 주소그대로: page.url() === 주소, 문의내용: await 상세.문의패널.isVisible() },
      { 주소그대로: true, 문의내용: true },
    );
  });

  await test.step('상품 문의 첫 질문을 누른다', async () => {
    await 상세.문의질문(질문[0]).click();
    await verify('상품 문의 질문을 누르면 그 아래 답변이 펼쳐진다', await 상세.문의답변(답변[0]).isVisible(), true);
  });

  await test.step('상품 문의 두 번째 질문을 누른다', async () => {
    await 상세.문의질문(질문[1]).click();
    await verify(
      '상품 문의 두 개를 차례로 누르면 둘 다 펼쳐진 채 보인다',
      [await 상세.문의답변(답변[0]).isVisible(), await 상세.문의답변(답변[1]).isVisible()],
      [true, true],
    );
  });

  await test.step('펼친 첫 질문을 다시 누른다', async () => {
    await 상세.문의질문(질문[0]).click();
    await verify('펼친 질문을 다시 누르면 답변이 접힌다', await 상세.문의답변(답변[0]).isVisible(), false);
  });
});
