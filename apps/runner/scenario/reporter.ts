// E2E 시나리오 전용 리포터 — 워커가 흘린 조각을 전부 진짜 stdout 으로 되돌려 쓰기만 한다 (SPEC 도메인/러너 §5.2)
// 결과는 고정 spec 이 부품마다 흘린 줄이다. 케이스 리포터(PlatformReporter)는 PLATFORM_HISTORY_ID 를 숫자로 읽어 여기서는 못 쓴다
// 이 파일에는 값을 가져오는 상대 import 를 두지 않는다 — 러너 이미지의 Node 24 가 './x.js' 를 x.ts 로 못 푼다 (packages/kit/src/runtime/reporter.ts)

import type { Reporter } from '@playwright/test/reporter';

class ScenarioReporter implements Reporter {
  // 골라 쓰면 안 된다. 이 메서드가 생기는 순간 워커 stdio 가 pipe 로 바뀌어, 안 넘긴 출력은 사라진다
  onStdOut(chunk: string | Buffer): void {
    process.stdout.write(chunk);
  }

  onStdErr(chunk: string | Buffer): void {
    process.stderr.write(chunk);
  }

  printsToStdio(): boolean {
    return true;
  }
}

export default ScenarioReporter;
