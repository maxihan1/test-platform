// 앱 파일 칸이 받는 값 — 파일 경로와 http(s) 주소만 받는지 본다 (러너 §5.2 「대상 서버마다 다른 앱 파일」 · APP-F1-10)

import { describe, expect, it } from 'vitest';

import { 앱파일값인가, 패키지이름인가 } from './protocol.js';

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

describe('패키지이름인가', () => {
  it('점으로 이은 꾸러미 이름은 패키지 이름이다 — 저장 검사도 받는다', () => {
    for (const 값 of ['com.shop.app', 'kr.co.demo_market.v2', 'A.b']) {
      expect(패키지이름인가(값)).toBe(true);
      expect(앱파일값인가(값)).toBe(true);
    }
  });

  it('끝 마디가 앱 파일 확장자면 파일이다 — 대소문자를 가리지 않는다', () => {
    for (const 값 of ['demo.apk', 'demo.APK', 'shop.apks', 'shop.aab', 'shop.xapk', 'shop.zip']) {
      expect(패키지이름인가(값)).toBe(false);
    }
  });

  it('경로 · 주소 · 마디 하나 · 숫자로 시작하는 마디는 패키지 이름이 아니다', () => {
    for (const 값 of ['/apk/com.shop.app', 'https://apk.example.com/com.shop.app', 'shop', 'com.1shop', 'com..shop', 'app-release.apk', ' com.shop.app']) {
      expect(패키지이름인가(값)).toBe(false);
    }
  });
});
