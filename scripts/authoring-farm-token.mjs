// 작성 자식이 띄우는 node 마다 먼저 읽히는 모듈 — 에이전트가 30분마다 갈아 끼우는 팜 토큰 파일을 PLATFORM_APPIUM_TOKEN 에 얹는다 (도메인/작성 §3.6 「링크 갈아 끼우기」)
// appium-cli · control-cli · 폰 돌려 보기(kit)는 모두 부를 때 환경값을 읽는다. 자식 셸의 환경은 시작 때 것이라 node 가 뜰 때 바꿔 준다
import { readFileSync } from 'node:fs';

const 파일 = process.env.AUTHORING_FARM_TOKEN_FILE;
if (파일) {
  try {
    const 토큰 = readFileSync(파일, 'utf8').trim();
    if (토큰 !== '') process.env.PLATFORM_APPIUM_TOKEN = 토큰;
  } catch {
    // 파일이 없으면 시작 때 받은 환경값으로 간다 — 3시간 안에는 같은 토큰이다
  }
}
