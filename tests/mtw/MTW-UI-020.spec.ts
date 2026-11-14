import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-020',
  name: '홈에서 「더 보기」를 누르면 「뮤트한 단어」 · 「뮤트한 사용자」 · 「차단한 사용자」 · 「차단한 도메인」 · 「개인정보와 도달」 · 「게시물 자동 삭제」 · 「암호 및 보안」 · 「가져오기 & 내보내기」 · 「로그아웃」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈에서 「더 보기」를 누른다', async () => {
    await 홈.열기();
    await 홈.메뉴.더보기.click();
    await 홈.펼침.열릴때까지();
    const 단어 = await verify('「뮤트한 단어」가 보인다', await 홈.펼침.항목('뮤트한 단어').isVisible(), true);
    const 뮤트 = await verify('「뮤트한 사용자」가 보인다', await 홈.펼침.항목('뮤트한 사용자').isVisible(), true);
    const 차단 = await verify('「차단한 사용자」가 보인다', await 홈.펼침.항목('차단한 사용자').isVisible(), true);
    const 도메인 = await verify('「차단한 도메인」이 보인다', await 홈.펼침.항목('차단한 도메인').isVisible(), true);
    const 도달 = await verify('「개인정보와 도달」이 보인다', await 홈.펼침.항목('개인정보와 도달').isVisible(), true);
    const 삭제 = await verify('「게시물 자동 삭제」가 보인다', await 홈.펼침.항목('게시물 자동 삭제').isVisible(), true);
    const 보안 = await verify('「암호 및 보안」이 보인다', await 홈.펼침.항목('암호 및 보안').isVisible(), true);
    const 가져오기 = await verify('「가져오기 & 내보내기」가 보인다', await 홈.펼침.항목('가져오기 & 내보내기').isVisible(), true);
    const 로그아웃 = await verify('「로그아웃」이 보인다', await 홈.펼침.항목('로그아웃').isVisible(), true);
    await verify(
      '홈에서 「더 보기」를 누르면 「뮤트한 단어」 · 「뮤트한 사용자」 · 「차단한 사용자」 · 「차단한 도메인」 · 「개인정보와 도달」 · 「게시물 자동 삭제」 · 「암호 및 보안」 · 「가져오기 & 내보내기」 · 「로그아웃」이 보인다',
      단어 && 뮤트 && 차단 && 도메인 && 도달 && 삭제 && 보안 && 가져오기 && 로그아웃,
      true,
    );
  });
});
