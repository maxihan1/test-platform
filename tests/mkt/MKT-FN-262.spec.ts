import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-262',
  name: '큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.큰이미지.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 큰 이미지를 누른다', async () => {
    await 상세.큰이미지.click();
    await 상세.확대위치.waitFor();
    await verify('큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다', await 상세.확대보기가화면전체를덮나(), true);
    await verify('확대 보기 위쪽에 「1 / 4」가 보인다', `${await 상세.확대위치.innerText()}${(await 상세.확대위치가위쪽에있나()) ? '' : ' (위쪽이 아님)'}`, '1 / 4');
  });

  await test.step('확대 보기의 오른쪽 화살표를 누른다', async () => {
    await 상세.확대다음.click();
    await verify('오른쪽 화살표를 누르면 「2 / 4」로 넘어간다', await 상세.확대위치.innerText(), '2 / 4');
  });

  await test.step('키보드 → 를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await verify('→ 키를 치면 「3 / 4」로 넘어간다', await 상세.확대위치.innerText(), '3 / 4');
  });

  await test.step('키보드 ← 를 친다', async () => {
    await page.keyboard.press('ArrowLeft');
    await verify('← 키를 치면 「2 / 4」로 돌아간다', await 상세.확대위치.innerText(), '2 / 4');
  });

  await test.step('ESC 를 친다', async () => {
    await page.keyboard.press('Escape');
    await 상세.확대보기닫힘기다리기();
    await verify('ESC 를 치면 확대 보기가 닫힌다', await 상세.확대보기.count(), 0);
  });

  await test.step('큰 이미지를 다시 누르고 확대 보기의 X 를 누른다', async () => {
    await 상세.큰이미지.click();
    await 상세.확대위치.waitFor();
    await 상세.확대닫기.click();
    await 상세.확대보기닫힘기다리기();
    await verify('X 를 누르면 확대 보기가 닫힌다', await 상세.확대보기.count(), 0);
  });
});
