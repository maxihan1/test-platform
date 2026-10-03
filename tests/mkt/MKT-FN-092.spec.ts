import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-092',
  name: '썸네일에 마우스를 올리면 큰 이미지가 그 썸네일 이미지로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '확대 보기 모달이 열려 있다'],
  params: z.object({
    productId: z.number().describe('상품 번호').default(2),
    hoverNo: z.number().describe('마우스를 올릴 썸네일 번호').default(3),
    clickNo: z.number().describe('누를 썸네일 번호').default(1),
  }),
  expected: z.object({
    nextNo: z.number().describe('오른쪽 화살표 뒤 이미지 번호').default(2),
    keyNo: z.number().describe('오른쪽 방향키 뒤 이미지 번호').default(3),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);
  const 이미지주소 = (번호: number): string => `/img/p/${params.productId}/${번호}`;

  await test.step('썸네일에 마우스를 올린다', async () => {
    await 상세.열기(params.productId);
    await 상세.썸네일(params.hoverNo).hover();
    await 상세.큰이미지를기다린다(이미지주소(params.hoverNo));
    await verify('썸네일에 마우스를 올리면 큰 이미지가 그 썸네일 이미지로 바뀐다', await 상세.큰이미지주소(), 이미지주소(params.hoverNo));
  });

  await test.step('썸네일을 누른다', async () => {
    await 상세.썸네일(params.clickNo).click();
    await 상세.큰이미지를기다린다(이미지주소(params.clickNo));
    await verify('썸네일을 누르면 큰 이미지가 그 썸네일 이미지로 바뀐다', await 상세.큰이미지주소(), 이미지주소(params.clickNo));
  });

  await test.step('큰 이미지를 누른다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대보기.waitFor();
    await verify('큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다', await 상세.확대보기가화면을덮는가(), true);
  });

  await test.step('모달의 오른쪽 화살표를 누른다', async () => {
    await verify('확대 보기 모달이 열려 있다', await 상세.확대보기.isVisible(), true, { blocker: true });
    await 상세.확대다음.click();
    await 상세.확대위치.filter({ hasText: `${expected.nextNo} / 4` }).waitFor();
    await verify(
      '확대 보기에서 화살표를 누르면 다음 이미지로 넘어가고 위쪽에 「2 / 4」처럼 현재 위치가 보인다',
      { 위치: await 상세.확대위치.innerText(), 이미지: await 상세.확대이미지.getAttribute('src') },
      { 위치: `${expected.nextNo} / 4`, 이미지: 이미지주소(expected.nextNo) },
    );
  });

  await test.step('키보드 오른쪽 방향키를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await 상세.확대위치.filter({ hasText: `${expected.keyNo} / 4` }).waitFor();
    await verify('확대 보기에서 키보드 오른쪽 방향키를 치면 다음 이미지로 넘어간다', await 상세.확대이미지.getAttribute('src'), 이미지주소(expected.keyNo));
  });

  await test.step('ESC 키를 친다', async () => {
    await page.keyboard.press('Escape');
    await 상세.확대보기.waitFor({ state: 'detached' });
    await verify('확대 보기는 ESC 로 닫힌다', await 상세.확대보기.count(), 0);
  });

  await test.step('모달의 X 를 누른다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대보기.waitFor();
    await verify('확대 보기 모달이 열려 있다', await 상세.확대보기.isVisible(), true, { blocker: true });
    await 상세.확대닫기.click();
    await 상세.확대보기.waitFor({ state: 'detached' });
    await verify('확대 보기는 X 로 닫힌다', await 상세.확대보기.count(), 0);
  });
});
