import { defineCase, test, verify } from '@platform/kit';
import { 공지상세화면 } from './pages/notice-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-040',
  name: '없는 번호의 공지 상세를 열면 「공지사항 정보가 없습니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 공지상세 = new 공지상세화면(page);

  await test.step('없는 번호의 공지 상세 주소(pstartSn=99999999)를 연다', async () => {
    await 공지상세.연다('99999999');
    await 공지상세.없는공지문구.waitFor();
    await verify('없는 번호의 공지 상세를 열면 「공지사항 정보가 없습니다.」가 보인다', await 공지상세.없는공지문구.isVisible(), true);
  });
});
