import { 멈춤기다림끄기, 뜰때까지, 보이나, 서버, 앱id, 키보드완료, 글자로고르기, 길게누르기, type 앱 } from './app.helper.js';

const 크롬첫화면넘기기 = 'id=com.android.chrome:id/signin_fre_dismiss_button';
const 웹이메일 = 'id=user_email';
const 웹암호 = 'id=user_password';
const 웹로그인틀 = 'id=new_user';
const 웹로그아웃 = '~로그아웃';
const 크롬탭닫기 = 'id=com.android.chrome:id/close_button';
const 웹승인 = 'android=new UiSelector().className("android.webkit.WebView").childSelector(new UiSelector().className("android.widget.Button").instance(0))';
const 웹거부 = 'android=new UiSelector().className("android.webkit.WebView").childSelector(new UiSelector().className("android.widget.Button").instance(1))';
const 권한허용 = 'id=com.android.permissioncontroller:id/permission_allow_button';
const 권한거부 = 'id=com.android.permissioncontroller:id/permission_deny_button';

let 들어온계정: string | undefined;

export type 권한답 = '허용' | '거부';

async function 먼저뜨는것(driver: 앱, 후보: Record<string, string>, 시간: number): Promise<string | undefined> {
  let 찾은: string | undefined;
  await driver
    .waitUntil(
      async () => {
        for (const [이름, 선택자] of Object.entries(후보)) {
          if (await 보이나(driver, 선택자)) {
            찾은 = 이름;
            return true;
          }
        }
        return false;
      },
      { timeout: 시간, interval: 700 },
    )
    .catch(() => undefined);
  return 찾은;
}

export async function 시작화면까지(driver: 앱): Promise<void> {
  await 멈춤기다림끄기(driver);
  const 지금 = await 먼저뜨는것(driver, { 시작: 앱id('btn_log_in'), 홈: 앱id('tab_home') }, 60_000);
  if (지금 === '시작') return;
  if (지금 !== '홈') throw new Error('앱 첫 화면도 홈도 60초 안에 뜨지 않았다');
  await 모든계정로그아웃(driver);
}

export async function 모든계정로그아웃(driver: 앱): Promise<void> {
  await 길게누르기(driver, 앱id('tab_profile'));
  const 줄 = await 글자로고르기(driver, 앱id('title'), '모든 계정 로그아웃하기');
  await 줄.click();
  await driver.$('id=android:id/button1').click();
  들어온계정 = undefined;
  if (!(await 뜰때까지(driver, 앱id('btn_log_in'), 30_000))) throw new Error('모든 계정 로그아웃 뒤 시작 화면이 뜨지 않았다');
}

export async function 로그인경로서버고르기(driver: 앱): Promise<void> {
  await 멈춤기다림끄기(driver);
  await driver.$(앱id('btn_log_in')).click();
  const 칸 = await driver.$(앱id('search_edit'));
  await 칸.waitForDisplayed({ timeout: 15_000 });
  await 칸.setValue(서버);
  const 카드 = await 글자로고르기(driver, 앱id('title'), 서버, 20_000);
  await 카드.click();
  await driver.$(앱id('btn_next')).click();
}

export async function 웹로그인승인(driver: 앱, 아이디: string, 비밀번호: string, 답: '승인' | '거부' = '승인'): Promise<void> {
  const 내계정 = `@${아이디.split('@')[0]}@${서버}`;
  let 넣었다 = false;
  let 다시 = 0;
  const 끝 = Date.now() + 100_000;
  while (Date.now() < 끝) {
    const 화면 = await driver.getPageSource();
    if (화면.includes('signin_fre_dismiss_button')) {
      await driver.$(크롬첫화면넘기기).click();
      continue;
    }
    const 로그인칸 = 화면.includes('resource-id="user_email"');
    if (로그인칸 && !넣었다) {
      await driver.$(웹이메일).setValue(아이디);
      await driver.$(웹암호).setValue(비밀번호);
      await 키보드완료(driver);
      넣었다 = true;
      continue;
    }
    const 승인화면 = !로그인칸 && !화면.includes('resource-id="new_user"') && 화면.includes('android.webkit.WebView') && (화면.match(/class="android\.widget\.Button"/g) ?? []).length >= 2;
    if (승인화면 && !넣었다 && !화면.includes(`text="${내계정}"`) && 다시 < 2) {
      await driver.$(웹로그아웃).click();
      await driver.$(웹로그인틀).waitForExist({ timeout: 15_000 }).catch(() => undefined);
      await driver.$(크롬탭닫기).click();
      await driver.$(앱id('btn_next')).waitForDisplayed({ timeout: 15_000 });
      await driver.$(앱id('btn_next')).click();
      다시++;
      continue;
    }
    if (승인화면) {
      await driver.$(답 === '승인' ? 웹승인 : 웹거부).click();
      return;
    }
    await driver.pause(500);
  }
  throw new Error('100초 안에 서버 웹 로그인 승인 화면에 닿지 못했다');
}

export async function 권한창답하기(driver: 앱, 답: 권한답): Promise<void> {
  const 지금 = await 먼저뜨는것(driver, { 권한: 권한허용, 홈: 앱id('tab_home') }, 60_000);
  if (지금 === '권한') await driver.$(답 === '허용' ? 권한허용 : 권한거부).click();
}

export async function 로그인하기(driver: 앱, 아이디: string | undefined, 비밀번호: string | undefined, 권한: 권한답 = '허용'): Promise<void> {
  if (!아이디 || !비밀번호) throw new Error('로그인 계정 값이 비어 있다 — 대상 서버 줄의 계정을 본다');
  await 멈춤기다림끄기(driver);
  const 지금 = await 먼저뜨는것(driver, { 시작: 앱id('btn_log_in'), 홈: 앱id('tab_home') }, 60_000);
  if (지금 === '홈' && process.env.PLATFORM_SCENARIO_MODE === '1' && 들어온계정 === 아이디) return;
  if (지금 === '홈') await 모든계정로그아웃(driver);
  else if (지금 !== '시작') throw new Error('앱 첫 화면도 홈도 60초 안에 뜨지 않았다');
  await 로그인경로서버고르기(driver);
  await 웹로그인승인(driver, 아이디, 비밀번호);
  await 권한창답하기(driver, 권한);
  if (!(await 뜰때까지(driver, 앱id('tab_home'), 60_000))) throw new Error('로그인 뒤 60초 안에 홈 하단 탭이 뜨지 않았다');
  들어온계정 = 아이디;
}
