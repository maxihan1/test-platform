// 케이스를 지우기 전에 그 케이스를 쓰는 E2E 시나리오를 번호 · 이름으로 보이는 안내 (도메인/카탈로그 §8.1 · 도메인/시나리오 §3.7 결정 8)

import { use말 } from './i18n.js';
import { scenarioApi } from './scenarioApi.js';
import { useAsync } from './ui.js';

/**
 * 목록을 못 읽어도(권한 · 서버 오류) 삭제를 막지 않는다 — 안내만 못 구체화하므로 못 돈다는 문장으로 대신한다.
 * 불러오는 동안과 0건일 때는 아무것도 안 그린다. 감싸는 상자가 그 문장을 이미 적었으면 `대신문장={false}` —
 * 일괄 삭제 상자가 그렇다. 안 끄면 같은 말이 두 번 나온다
 */
export function ScenarioUsage({ service, tcIds, 대신문장 = true }: { service: string; tcIds: string[]; 대신문장?: boolean }) {
  const t = use말();
  const { data, error } = useAsync(() => scenarioApi.list(service, tcIds), [service, tcIds.join(',')]);

  if (error !== null) {
    return 대신문장 ? <p className="hint">{t('삭제하면 이 케이스를 쓰는 E2E 시나리오가 더 돌지 않습니다. 실행 기록은 남습니다.')}</p> : null;
  }
  if (data === null || data.items.length === 0) return null;
  return (
    <div className="hint">
      <p>{t('이 케이스를 쓰는 E2E 시나리오 {수}개 — 삭제하면 다른 케이스로 바꿀 때까지 실행할 수 없습니다', { 수: data.items.length })}</p>
      <ul className="edit-list">
        {data.items.map((줄) => (
          <li key={줄.id}>
            <a href={`#/scenarios/${String(줄.id)}`}>SC-{줄.id} {줄.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
