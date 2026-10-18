import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 사라졌나, 전환기록기다리기, 전환기록비우기, 전환기록읽기, 전환기록하기, 팝업배경전환읽기 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-027',
  name: '공지 팝업이 0.3초 동안 서서히 나타난다',
  platforms: ['desktop', 'mobile'],
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열어 공지 팝업이 뜨는 모습을 확인한다', async () => {
    await 쿠키띠와설문만막기(page);
    await 전환기록하기(page);
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await verify('공지 동의 기록이 없다', await page.evaluate(() => localStorage.getItem('dm_notice_hide') === null), true, { blocker: true });
    const 전환 = await 팝업배경전환읽기(page);
    await verify('공지 팝업이 0.3초 동안 서서히 나타난다', 전환.속성.includes('opacity') && 전환.시간 === '0.3s', true);
  });

  await test.step('공지 팝업의 「닫기」를 누른다', async () => {
    await 전환기록비우기(page);
    await 홈.공지닫기버튼.click();
    await 전환기록기다리기(page, '전환', 'opacity');
    const 닫힘 = await 사라졌나(홈.팝업배경);
    const 기록 = await 전환기록읽기(page);
    await verify('공지 팝업이 닫힌다', 닫힘, true, { blocker: true });
    await verify(
      '공지 팝업을 닫으면 0.3초 동안 서서히 사라진다',
      기록.some((줄) => 줄.종류 === '전환' && 줄.이름 === 'opacity' && 줄.대상.includes('modal-backdrop') && 줄.시간 === '0.3s'),
      true,
    );
  });
});
