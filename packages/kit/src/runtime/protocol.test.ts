// 앱 파일 칸이 받는 값 — 파일 경로와 http(s) 주소만 받는지 본다 (러너 §5.2 「대상 서버마다 다른 앱 파일」 · APP-F1-10)

import { describe, expect, it } from 'vitest';

import { 앱파일값인가 } from './protocol.js';

describe('앱파일값인가', () => {
  it('파일 경로와 http(s) 주소는 받는다', () => {
    for (const 값 of ['/apk/qa.apk', 'C:\\apk\\qa.apk', 'http://host.docker.internal:8080/a.apk', 'HTTPS://apk.example.com/a.apk']) {
      expect(앱파일값인가(값)).toBe(true);
    }
  });

  it('다른 꼴의 주소와 호스트 없는 주소는 거절한다', () => {
    for (const 값 of ['file:///etc/a.apk', 'ftp://h/a.apk', 'http:///a.apk', 'x/https://a.apk']) {
      expect(앱파일값인가(값)).toBe(false);
    }
  });
});
