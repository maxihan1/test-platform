import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 공지보이게, 설문보이게, 안내창다시막기, 안내창조절 } from './helpers/member-tools.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-344',
  name: '홈에서 배너 「다음」을 누르면 다음 장 배너가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 제목 = new 화면제목(page);
  await 안내창조절(page);
  await page.clock.install();

  await test.step('홈 배너 「다음」을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.배너.그려질때까지();
    await 홈.배너.다음.click();
    await verify('홈에서 배너 「다음」을 누르면 다음 장 배너가 보인다', await 홈.배너.현재장(), 2);
  });

  await test.step('홈 배너 「이전」을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.배너.그려질때까지();
    await 홈.배너.점(2).click();
    await 홈.배너.이전.click();
    await verify('홈에서 배너 「이전」을 누르면 앞 장 배너가 보인다', await 홈.배너.현재장(), 1);
  });

  await test.step('공지 팝업의 「×」를 누른다', async () => {
    await 공지보이게(page);
    await 홈.머리만열기();
    await 홈.공지창.뜰때까지();
    await 홈.공지창.닫기X.click();
    await 홈.공지창.사라질때까지();
    await verify('홈에서 공지 팝업 「×」를 누르면 공지 팝업이 닫힌다', await 홈.공지창.창.isVisible(), false);
  });

  await test.step('만족도 설문 모달의 「×」를 누른다', async () => {
    await 안내창다시막기(page);
    await 설문보이게(page);
    await 홈.머리만열고설정응답까지();
    await page.clock.runFor(15000);
    await 홈.설문창.뜰때까지();
    await 홈.설문창.닫기X.click();
    await 홈.설문창.사라질때까지();
    await verify('홈에서 만족도 설문 「×」를 누르면 설문 모달이 닫힌다', await 홈.설문창.창.isVisible(), false);
  });

  await test.step('추천 상품 카드를 누른다', async () => {
    await 안내창다시막기(page);
    await 홈.열기();
    const 카드 = 홈.추천카드들.first();
    const 상품이름 = await 홈.추천카드이름(카드).innerText();
    await 카드.click();
    await 홈.상품상세그려질때까지();
    await verify('홈에서 추천 상품 카드를 누르면 그 상품 상세가 보인다', await 제목.글(상품이름).isVisible(), true);
  });
});
