// 작성 에이전트가 만든 고객 서비스 테스트 폴더인지 판정한다
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { 부품파일꼴, 케이스파일꼴, 페이지파일꼴 } from './cases-only.mjs';

/**
 * 작성 에이전트가 고객 서비스용으로 만든 폴더인가. 맨 위 파일이 **전부** 케이스 spec(`<접두사>-NNN` · `<접두사>-UI-NNN` ·
 * `<접두사>-FN-NNN`)이고 접두사가 하나이며, 하위 폴더는 `pages/`(`*.page.ts`) · `components/`(`*.component.ts`) 둘뿐이어야 참이다.
 *
 * 왜 면제하나 — 서비스 폴더는 CI 에서 돌 수가 없다. 대상이 고객사 내부 서버라 CI 에는 PLATFORM_BASE_URL 도 길도 없다.
 * 병합 근거는 에이전트가 PR 본문에 싣는 관문 3(3회 실행) 기록이다 (docs/HOOKS.md 「가벼운 길」).
 * 모양을 좁게 잡은 까닭 — 도우미 파일·섞인 접두사·케이스 없는 폴더·그 밖의 하위 폴더·한 단계 더 들어간 Page Object 는
 * 에이전트 산출물이 아니다. 그런 폴더(앞으로의 플랫폼 샘플 등)는 여전히 CI 에서 돌거나 면제 목록에 사유를 달아야 걸린다.
 * 꼴은 cases-only.mjs 의 것을 그대로 쓴다 — cases 차선이 받는 모양과 여기서 면제하는 모양이 어긋나지 않게.
 * 알려진 한계 — 사람이 그 모양으로 폴더를 만들면 이름만 보고 면제된다. 내용이 정말 에이전트 것인지는 안 본다.
 */
export function 서비스폴더인가(폴더경로) {
  // 꼴이 저장소 루트 기준 경로를 받으므로 폴더 이름 자리는 아무 이름으로 채운다
  const 경로 = (이름) => `tests/_/${이름}`;
  const 하위꼴 = { pages: 페이지파일꼴, components: 부품파일꼴 };
  const 접두사들 = [];
  for (const d of readdirSync(폴더경로, { withFileTypes: true })) {
    if (d.isDirectory()) {
      if (!Object.hasOwn(하위꼴, d.name)) return false;
      const 꼴 = 하위꼴[d.name];
      const 안 = readdirSync(join(폴더경로, d.name), { withFileTypes: true });
      if (!안.every((e) => e.isFile() && 꼴.test(경로(`${d.name}/${e.name}`)))) return false;
    } else if (d.isFile() && 케이스파일꼴.test(경로(d.name))) {
      접두사들.push(d.name.split('-')[0]);
    } else {
      return false;
    }
  }
  return 접두사들.length > 0 && 접두사들.every((p) => p === 접두사들[0]);
}
