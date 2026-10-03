import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number };

export const spec = defineCase({
  tcId: 'MKT-FN-050',
  name: '「링크 복사」를 누르면 글 주소가 클립보드에 복사되고 토스트 「링크를 복사했습니다」가 보인다',
  precondition: ['클립보드 권한을 줬다', '클립보드는 가짜 구현(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 글들 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 대상 = 글들[글들.length - 3]?.id ?? 0;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.context().addInitScript(() => {
    let 내용 = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (글: string): Promise<void> => {
          내용 = 글;
        },
        readText: async (): Promise<string> => 내용,
      },
    });
  });

  await test.step('상세 화면에서 「링크 복사」를 누른다', async () => {
    await 상세.열기(대상);
    await 상세.댓글제목().waitFor();
    await 상세.링크복사버튼().click();
    await 상세.클립보드채워질때까지기다리기();
    await verify('「링크 복사」를 누르면 글 주소가 클립보드에 복사된다', await 상세.클립보드읽기(), `${new URL(page.url()).origin}/board/${대상}`);
    await 알림.영역().waitFor();
    await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 알림.문구('링크를 복사했습니다').isVisible(), true);
  });
});
