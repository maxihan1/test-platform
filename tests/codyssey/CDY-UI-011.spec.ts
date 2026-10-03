import { defineCase, test, verify } from '@platform/kit';
import { 캠퍼스안내화면 } from './pages/about-campus.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-011',
  name: '캠퍼스 안내 화면에 제목과 머리글이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 캠퍼스안내화면(page);

  await test.step('캠퍼스 안내 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('캠퍼스 안내 화면에 제목 「캠퍼스 안내」가 보인다', await 화면.제목.isVisible(), true);
    await verify('캠퍼스 안내 화면에 머리글 「지역별 Codyssey 캠퍼스」가 보인다', await 화면.머리글('지역별 Codyssey 캠퍼스').isVisible(), true);
    await verify(
      '캠퍼스 안내 화면에 머리글 「공간 소개」 「층별 안내」 「캠퍼스 소개영상」 「오시는 길」이 보인다',
      (await 화면.보이는머리글(['공간 소개', '층별 안내', '캠퍼스 소개영상', '오시는 길'])).join(', '),
      '공간 소개, 층별 안내, 캠퍼스 소개영상, 오시는 길',
    );
  });
});
