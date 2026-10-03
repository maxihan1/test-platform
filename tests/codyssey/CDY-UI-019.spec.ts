import { defineCase, test, verify } from '@platform/kit';
import { 제목 } from './components/title.component.js';
import { 코디세이사람들화면 } from './pages/people.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-019',
  name: '코디세이 사람들 화면에 제목과 검색어 칸, 검색 버튼, 꺼진 쪽 이동이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 코디세이사람들화면(page);
  const 제목부 = new 제목(page);

  await test.step('코디세이 사람들 화면을 연다', async () => {
    await 화면.연다();
    await 화면.다음버튼.waitFor();
    await verify('코디세이 사람들 화면에 제목 「코디세이 사람들」이 보인다', await 제목부.대제목('코디세이 사람들').isVisible(), true);
    await verify('코디세이 사람들 화면의 검색어 칸에 안내 「검색어를 입력하세요.」가 보인다', await 화면.검색어칸.isVisible(), true);
    await verify('코디세이 사람들 화면에 「검색」 버튼이 보인다', await 화면.검색버튼.isVisible(), true);
    await verify(
      '코디세이 사람들 화면의 쪽 이동 「이전」 「다음」은 꺼져 있다',
      [await 화면.이전버튼.isDisabled(), await 화면.다음버튼.isDisabled()],
      [true, true],
    );
  });
});
