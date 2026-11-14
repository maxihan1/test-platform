// 앱 케이스가 폰 사진첩 · 다운로드에 사진 · 영상 · 파일을 넣고 끝나면 지운다 — 글쓰기 첨부처럼 폰에 둔 미디어가 필요한 앱 기능을 준비한다 (SPEC 공통/2-명세선언 「Android 앱 케이스」 「폰에 파일 넣기」)
import type { AppDriver } from './app.js';

export type 폰파일종류 = '사진' | '영상' | '파일';

export interface 폰파일 {
  /** 폰 안 경로 — 앱의 파일 고르기 화면에서 이름(`qa-…`)으로 보인다 */
  경로: string;
  이름: string;
  /** 넣은 파일을 지우고 사진첩에서도 뺀다. 두 번 불러도 된다 */
  지우기(): Promise<void>;
}

// 저장소에 사진 파일을 두지 않는다 — 64x64 단색 PNG 와 1초 64x64 H.264 MP4(moov 가 앞에 있어 뒤를 늘려도 읽힌다)를 글자로 싣는다
const 사진글 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAABAAAAAQBPJcTWAAAAZElEQVR4nO3PQQ3AIADAQEhQhRkU42kieFyW9BS0c587/mzpgFcNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB+bdgJkBVFcyAAAAABJRU5ErkJggg==';
const 영상글 =
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAN2bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAqB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAQAAABAAAAAAIYbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABw21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAYNzdGJsAAAAv3N0c2QAAAAAAAAAAQAAAK9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABFUxhdmM2Mi4yOC4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAK/+EAGGdkAAqs2UQmwEQAAAMABAAAAwAoPEiWWAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAYcAAAAAAAAAAYc3R0cwAAAAAAAAABAAAABQAACAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAADhjdHRzAAAAAAAAAAUAAAABAAAQAAAAAAEAACgAAAAAAQAAEAAAAAABAAAAAAAAAAEAAAgAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAFAAAAAQAAAChzdHN6AAAAAAAAAAAAAAAFAAAC3AAAAA4AAAAMAAAADAAAAAwAAAAUc3RjbwAAAAAAAAABAAADpgAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjIuMTIuMTAyAAAACGZyZWUAAAMWbWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjUgcjMyMjIgYjM1NjA1YSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjUgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0yIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj01IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAJ2WIhAAS//7oyfzLJ++PUT+DlxVxaccwj0dI/65B2ZLyCHBWQeLicQAAAApBmiRsQ//+qZ00AAAACEGeQniCHwLHAAAACAGeYXRD/wTEAAAACAGeY2pD/wTF';

const 자리: Record<폰파일종류, { 폴더: string; 확장자: string; 글: string }> = {
  사진: { 폴더: '/sdcard/Pictures', 확장자: 'png', 글: 사진글 },
  영상: { 폴더: '/sdcard/Movies', 확장자: 'mp4', 글: 영상글 },
  파일: { 폴더: '/sdcard/Download', 확장자: 'txt', 글: Buffer.from('QA Hub 케이스가 넣은 파일\n').toString('base64') },
};

/**
 * 폰에 파일 하나를 넣는다. `크기`(바이트)를 주면 폰 안에서 그 크기까지 뒤를 0 으로 채운다 — 업로드 크기 한도 같은 경계를 맞출 때 쓴다.
 * 파일은 늘 작게 보낸다 — 디바이스 팜이 받는 요청 본문 상한이 64MB 라(base64 로 늘어난다) 큰 파일을 그대로 못 싣는다.
 * 사진첩 · 영상 목록에 바로 보이게 미디어 훑기를 부른다. 케이스는 `finally` 에서 `지우기()` 를 부른다 — 남기면 다음 케이스의 사진첩에 섞인다
 */
export async function 폰에파일넣기(driver: AppDriver, 종류: 폰파일종류, 선택: { 크기?: number; 확장자?: string } = {}): Promise<폰파일> {
  const 틀 = 자리[종류];
  const 바탕크기 = Buffer.from(틀.글, 'base64').length;
  if (선택.크기 !== undefined && (!Number.isInteger(선택.크기) || 선택.크기 < 바탕크기)) {
    throw new Error(`폰에파일넣기: ${종류} 크기는 ${String(바탕크기)}바이트 이상 정수다 — ${String(선택.크기)}`);
  }
  const 확장자 = 선택.확장자 ?? 틀.확장자;
  if (!/^[a-z0-9]{1,8}$/.test(확장자)) throw new Error(`폰에파일넣기: 확장자는 영문 소문자 · 숫자 8자까지다 — ${확장자}`);
  const 이름 = `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${확장자}`;
  const 경로 = `${틀.폴더}/${이름}`;
  await driver.pushFile(경로, 틀.글);
  if (선택.크기 !== undefined && 선택.크기 > 바탕크기) {
    await driver.execute('mobile: shell', { command: 'truncate', args: ['-s', String(선택.크기), 경로] });
  }
  await 훑기(driver, 경로);
  let 지움 = false;
  return {
    경로,
    이름,
    지우기: async () => {
      if (지움) return;
      지움 = true;
      await driver.execute('mobile: shell', { command: 'rm', args: ['-f', 경로] });
      await 훑기(driver, 경로);
    },
  };
}

// 미디어 훑기는 UiAutomator2 의 mobile: scanMedia 가 먼저다 — 못 하면(옛 드라이버) 방송으로 부른다. 둘 다 안 되면 사진첩에 늦게 보일 뿐이라 던지지 않는다
async function 훑기(driver: AppDriver, 경로: string): Promise<void> {
  try {
    await driver.execute('mobile: scanMedia', { remotePath: 경로 });
  } catch {
    await driver
      .execute('mobile: shell', { command: 'am', args: ['broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', `file://${경로}`] })
      .catch((err: unknown) => console.error(`[kit] 미디어 훑기를 못 불렀다(사진첩에 늦게 보일 수 있다): ${err instanceof Error ? err.message : String(err)}`));
  }
}
