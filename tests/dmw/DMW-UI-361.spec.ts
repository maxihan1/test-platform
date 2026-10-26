import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-361',
  name: '이용약관 본문의 조 제목이 「제1조 (목적)」부터 「제12조 (분쟁 해결)」까지 차례로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

const 조제목 = [
  '제1조 (목적)',
  '제2조 (정의)',
  '제3조 (약관의 게시와 개정)',
  '제4조 (회원가입)',
  '제5조 (회원 탈퇴 및 자격 상실)',
  '제6조 (서비스의 제공)',
  '제7조 (서비스 이용의 제한)',
  '제8조 (게시물의 관리)',
  '제9조 (구매 신청 및 결제)',
  '제10조 (청약 철회)',
  '제11조 (면책)',
  '제12조 (분쟁 해결)',
];

test(spec, async ({ page }) => {
  const 이용약관 = new 이용약관화면(page);
  await 안내창막기(page);

  await test.step('이용약관 화면을 연다', async () => {
    await 이용약관.열기();
    await verify('비회원이다', await 이용약관.머리.로그인.isVisible(), true, { blocker: true });
    await verify('이용약관 주소가 열려 있다', await 이용약관.현재주소(), '/terms', { blocker: true });
  });

  await test.step('이용약관 본문의 조 제목을 확인한다', async () => {
    await 이용약관.본문.waitFor();
    await verify('이용약관 본문의 조 제목이 「제1조 (목적)」부터 「제12조 (분쟁 해결)」까지 차례로 보인다', (await 이용약관.조제목들()).join(', '), 조제목.join(', '));
  });
});
