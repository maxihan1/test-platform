import { defineCase, test, verify } from '@platform/kit';
import { 상담창 } from './components/chat.component.js';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-403',
  name: '고객센터 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '상담 창이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const 로그인 = new 로그인화면(page);
  const 상담 = new 상담창(page);

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await verify('FAQ 질문 목록이 보인다', (await 고객센터.질문들.count()) > 0, true, { blocker: true });
  });

  await test.step('고객센터 화면에서 「배송」을 누른다', async () => {
    const 앞질문들 = (await 고객센터.질문글들()).join(', ');
    await 고객센터.탭누르기('배송');
    await 고객센터.질문(앞질문들.split(', ')[0] ?? '').waitFor({ state: 'detached' });
    await verify(
      '고객센터 화면에서 「배송」을 누르면 「배송」 질문 목록이 보인다',
      { 골라진탭: await 고객센터.탭('배송').getAttribute('aria-selected'), 질문바뀜: (await 고객센터.질문글들()).join(', ') !== 앞질문들 },
      { 골라진탭: 'true', 질문바뀜: true },
    );
  });

  await test.step('고객센터 화면에서 「첫 질문」을 누른다', async () => {
    const 첫질문 = (await 고객센터.질문글들())[0] ?? '';
    await 고객센터.질문누르기(첫질문);
    await verify(
      '고객센터 화면에서 「첫 질문」을 누르면 답이 펼쳐진다',
      { 질문펼침: await 고객센터.질문(첫질문, true).isVisible(), 펼친답: await 고객센터.펼친답들.count() },
      { 질문펼침: true, 펼친답: 1 },
    );
  });

  await test.step('고객센터 화면에서 「1:1 문의」를 누른다', async () => {
    await 고객센터.일대일문의링크.click();
    await 로그인.제목.waitFor();
    await verify('고객센터 화면에서 「1:1 문의」를 누르면 비회원은 로그인 화면이 보인다', await 로그인.제목.isVisible(), true);
  });

  await test.step('고객센터 화면에서 「축소」를 누른다', async () => {
    await 고객센터.열기();
    await 고객센터.배율.waitFor();
    const 앞 = await 고객센터.배율숫자();
    await 고객센터.축소버튼.click();
    await verify('고객센터 화면에서 「축소」를 누르면 지도 배율 숫자가 줄어든다', (await 고객센터.배율숫자()) < 앞, true);
  });

  await test.step('상담 창을 연다', async () => {
    await 상담.열기();
  });

  await test.step('상담 창이 열렸는지 확인한다', async () => {
    await verify('상담 창이 보인다', await 상담.창.isVisible(), true, { blocker: true });
  });

  await test.step('고객센터 화면에서 「상담 창 닫기」를 누른다', async () => {
    await 상담.닫기.click();
    await verify('고객센터 화면에서 「상담 창 닫기」를 누르면 상담 창이 닫힌다', await 상담.창.isVisible(), false);
  });
});
