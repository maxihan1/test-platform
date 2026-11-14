import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-473',
  name: '미디어 뷰어 상단에 뒤로 · 「다운로드」, 하단에 대체 텍스트 · 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('hana_photo 사진 글의 사진을 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 프로필.사진누르기();
    const 판정1 = await verify('미디어 뷰어가 열린다', await 뷰어.떴나(), true);
    const 판정2 = await verify('미디어 뷰어 상단에 「다운로드」가 보인다', await 뷰어.글자보이나('다운로드'), true);
    const 판정3 = await verify('미디어 뷰어 상단에 뒤로 버튼이 보인다', await 뷰어.글자보이나('뒤로'), true);
    const 판정4 = await verify('미디어 뷰어 하단에 「대체 텍스트」가 보인다', await 뷰어.글자보이나('대체 텍스트'), true);
    const 판정5 = await verify('미디어 뷰어 하단에 「답장」가 보인다', await 뷰어.글자보이나('답장'), true);
    const 판정6 = await verify('미디어 뷰어 하단에 「부스트」가 보인다', await 뷰어.글자보이나('부스트'), true);
    const 판정7 = await verify('미디어 뷰어 하단에 「좋아요」가 보인다', await 뷰어.글자보이나('좋아요'), true);
    const 판정8 = await verify('미디어 뷰어 하단에 「북마크」가 보인다', await 뷰어.글자보이나('북마크'), true);
    const 판정9 = await verify('미디어 뷰어 하단에 「공유」가 보인다', await 뷰어.글자보이나('공유'), true);
    await verify('미디어 뷰어 상단에 뒤로 · 「다운로드」, 하단에 대체 텍스트 · 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5 && 판정6 && 판정7 && 판정8 && 판정9, true);
  }, { capture: true });
});
