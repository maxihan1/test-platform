import type { AppDriver } from '@platform/kit/app';
import { 권한창답하기, 먼저뜨는것, 뜰때까지, 보이나, 움직이는화면에서, 칸에적기, type 권한답 } from '@platform/kit/parts';

import { 계정줄, 서버, 앱id, 목록안글자 } from './app.helper.js';

const 크롬 = {
  첫실행넘기기: 'id=com.android.chrome:id/signin_fre_dismiss_button',
  이메일: 'id=user_email',
  암호: 'id=user_password',
  로그인버튼: 'android=new UiSelector().resourceId("new_user").childSelector(new UiSelector().className("android.widget.Button").text("로그인"))',
  승인: 'android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().className("android.widget.Button").text("승인"))',
  거부: 'android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().className("android.widget.Button").text("거부"))',
  웹로그아웃: '~로그아웃',
  권한창: 'id=com.android.permissioncontroller:id/permission_message',
} as const;

async function 웹폼적기(driver: AppDriver, 아이디: string, 암호: string): Promise<void> {
  await 칸에적기(await driver.$(크롬.이메일).getElement(), 아이디);
  if (!(await 뜰때까지(driver, 크롬.암호, 3_000))) {
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await 뜰때까지(driver, 크롬.암호, 5_000);
  }
  await 칸에적기(await driver.$(크롬.암호).getElement(), 암호);
  if (!(await 뜰때까지(driver, 크롬.로그인버튼, 3_000)) && (await driver.isKeyboardShown())) await driver.hideKeyboard();
}

export const 시작화면표지 = 앱id('btn_log_in');
export const 홈표지 = 앱id('tab_home');

function 웹계정글(아이디: string): string {
  return `android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().text(${JSON.stringify(계정줄(아이디))}))`;
}

export async function 지금화면(driver: AppDriver, 시간 = 30_000): Promise<'시작' | '홈' | undefined> {
  return 움직이는화면에서(driver, () => 먼저뜨는것(driver, { 시작: 시작화면표지, 홈: 홈표지 }, 시간));
}

export async function 들어온계정인가(driver: AppDriver, 아이디: string): Promise<boolean> {
  await driver.$(앱id('settings')).click();
  await 뜰때까지(driver, 앱id('list'));
  const 같다 = await 보이나(driver, 목록안글자(계정줄(아이디)));
  await driver.back();
  await 뜰때까지(driver, 홈표지);
  return 같다;
}

export async function 모두로그아웃하기(driver: AppDriver): Promise<void> {
  for (let 남음 = 3; 남음 > 0 && (await 지금화면(driver, 10_000)) === '홈'; 남음 -= 1) {
    await driver.$(앱id('settings')).click();
    await 뜰때까지(driver, 앱id('list'));
    const 첫계정 = `android=new UiSelector().resourceId("${앱id('list').slice(3)}").childSelector(new UiSelector().textStartsWith("@"))`;
    await driver.$(첫계정).click();
    const 로그아웃줄 = `android=new UiScrollable(new UiSelector().resourceId("${앱id('list').slice(3)}")).scrollIntoView(new UiSelector().text("로그아웃"))`;
    await driver.$(로그아웃줄).click();
    await 뜰때까지(driver, 'id=android:id/button1');
    await driver.$('id=android:id/button1').click();
  }
  await 지금화면(driver);
}

export async function 서버고르고다음(driver: AppDriver): Promise<void> {
  await 뜰때까지(driver, `android=new UiSelector().resourceId("${앱id('list').slice(3)}").childSelector(new UiSelector().resourceId("${앱id('title').slice(3)}"))`, 15_000);
  const 칸 = await driver.$(앱id('search_edit')).getElement();
  await 칸.click();
  await 칸에적기(칸, 서버.slice(0, -1));
  await driver.execute('mobile: pressKey', { keycode: 41 });
  const 카드 = `android=new UiSelector().resourceId("${앱id('list').slice(3)}").childSelector(new UiSelector().resourceId("${앱id('title').slice(3)}").text(${JSON.stringify(서버)}))`;
  await 뜰때까지(driver, 카드, 20_000);
  await driver.$(카드).click();
  await 뜰때까지(driver, `android=new UiSelector().resourceId("${앱id('btn_next').slice(3)}").enabled(true)`, 10_000);
  await driver.$(앱id('btn_next')).click();
}

export async function 웹으로로그인마치기(driver: AppDriver, 아이디: string, 암호: string, 알림권한: 권한답 = '허용'): Promise<void> {
  const 끝 = Date.now() + 90_000;
  while (Date.now() < 끝) {
    const 뜬것 = await 먼저뜨는것(
      driver,
      { 홈: 홈표지, 권한: 크롬.권한창, 첫실행: 크롬.첫실행넘기기, 로그인폼: 크롬.이메일, 승인: 크롬.승인 },
      30_000,
    );
    if (뜬것 === undefined) throw new Error('로그인 중 아는 화면(크롬 첫 실행 · 로그인 폼 · 승인 · 권한 창 · 홈)이 30초 안에 안 떴다');
    if (뜬것 === '홈') return;
    if (뜬것 === '권한') await 권한창답하기(driver, 알림권한);
    if (뜬것 === '첫실행') await driver.$(크롬.첫실행넘기기).click();
    if (뜬것 === '로그인폼') {
      await 웹폼적기(driver, 아이디, 암호);
      await driver.$(크롬.로그인버튼).click();
      await 먼저뜨는것(driver, { 승인: 크롬.승인, 홈: 홈표지 }, 20_000);
    }
    if (뜬것 === '승인') {
      if ((await 보이나(driver, 크롬.웹로그아웃)) && !(await 보이나(driver, 웹계정글(아이디)))) {
        await driver.$(크롬.웹로그아웃).click();
        await 뜰때까지(driver, 크롬.이메일, 20_000);
      } else {
        await driver.$(크롬.승인).click();
        await 먼저뜨는것(driver, { 홈: 홈표지, 권한: 크롬.권한창 }, 30_000);
      }
    }
  }
  throw new Error('로그인이 90초 안에 끝나지 않았다');
}

export async function 웹승인화면까지(driver: AppDriver, 아이디: string, 암호: string): Promise<void> {
  const 끝 = Date.now() + 60_000;
  while (Date.now() < 끝) {
    const 뜬것 = await 먼저뜨는것(driver, { 첫실행: 크롬.첫실행넘기기, 로그인폼: 크롬.이메일, 승인: 크롬.승인 }, 30_000);
    if (뜬것 === undefined) throw new Error('승인 화면이 30초 안에 안 떴다');
    if (뜬것 === '첫실행') await driver.$(크롬.첫실행넘기기).click();
    if (뜬것 === '로그인폼') {
      await 웹폼적기(driver, 아이디, 암호);
      await driver.$(크롬.로그인버튼).click();
      await 뜰때까지(driver, 크롬.승인, 20_000);
    }
    if (뜬것 === '승인') {
      if ((await 보이나(driver, 크롬.웹로그아웃)) && !(await 보이나(driver, 웹계정글(아이디)))) {
        await driver.$(크롬.웹로그아웃).click();
        await 뜰때까지(driver, 크롬.이메일, 20_000);
      } else return;
    }
  }
  throw new Error('승인 화면까지 60초 안에 못 갔다');
}

export const 웹승인화면 = 크롬;

export async function 로그인하기(
  driver: AppDriver,
  아이디: string | undefined,
  암호: string | undefined,
  알림권한: 권한답 = '허용',
): Promise<void> {
  if (!아이디 || !암호) throw new Error('로그인 계정 값이 비었다 — 대상 서버 줄에 그 역할 계정이 있어야 한다');
  let 지금 = await 움직이는화면에서(driver, () => 먼저뜨는것(driver, { 시작: 시작화면표지, 홈: 홈표지, 권한: 크롬.권한창 }, 30_000));
  if (지금 === '권한') {
    await 권한창답하기(driver, 알림권한);
    지금 = await 지금화면(driver);
  }
  if (지금 === '홈') {
    if (await 들어온계정인가(driver, 아이디)) return;
    await 모두로그아웃하기(driver);
  } else if (지금 === undefined) {
    throw new Error('앱 시작 화면도 홈도 30초 안에 안 떴다');
  }
  await 움직이는화면에서(driver, async () => {
    await driver.$(시작화면표지).click();
    await 뜰때까지(driver, 앱id('search_edit'), 10_000);
  });
  await 서버고르고다음(driver);
  await 웹으로로그인마치기(driver, 아이디, 암호, 알림권한);
}

export async function 시작화면열기(driver: AppDriver): Promise<void> {
  const 지금 = await 지금화면(driver);
  if (지금 === '홈') await 모두로그아웃하기(driver);
  else if (지금 === undefined) throw new Error('앱 시작 화면도 홈도 30초 안에 안 떴다');
}
