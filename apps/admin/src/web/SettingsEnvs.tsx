// 설정 화면의 대상 서버 편집기 (SPEC §8.8 · §6 service_env)
// 여러 줄이다 — 환경변수 한 줄로는 서비스가 셋만 되어도 안 들어간다

import type { EnvRow } from './api.js';

/**
 * 편집 중인 대상 서버 한 줄.
 *
 * `key` 는 **화면에만 있는 값**이다 — 서버로 보낼 때 뺀다. 줄 순서를 열쇠로 쓰면
 * 가운데를 뺐을 때 뒤 줄이 앞 줄의 DOM 을 물려받아, 한글을 조합하던 중이면 그 글자가
 * 엉뚱한 줄에 남는다.
 */
export interface 줄 extends EnvRow {
  key: string;
}

let 줄번호 = 0;
function 새줄키(): string {
  줄번호 += 1;
  return `줄-${String(줄번호)}`;
}

export const 줄로 = (envs: EnvRow[]): 줄[] => envs.map((it) => ({ ...it, key: 새줄키() }));
export const 보낼모양 = (줄들: 줄[]): EnvRow[] => 줄들.map(({ env, baseUrl }) => ({ env, baseUrl }));

/** 대상 서버는 여러 줄이다. 환경변수 한 줄로는 서비스가 셋만 되어도 안 들어간다 (SPEC §8.8) */
export function EnvEditor({ envs, onChange }: { envs: 줄[]; onChange: (next: 줄[]) => void }) {
  return (
    <div className="field">
      <span className="field-label">대상 서버</span>
      <div className="set-envs" role="group" aria-label="대상 서버 목록">
        {envs.map((it, i) => (
          // 줄을 빼면 뒤 줄이 DOM 을 물려받는다. 값은 state 가 쥐고 있어 안 틀리지만
          // 한글을 조합하는 중에 빼면 조합하던 글자가 엉뚱한 줄에 남는다
          <div className="set-env" key={it.key}>
            <input
              type="text"
              value={it.env}
              placeholder="qa"
              aria-label={`대상 서버 ${String(i + 1)} 키`}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, env: e.target.value } : v)))}
            />
            <input
              type="text"
              value={it.baseUrl}
              placeholder="https://qa.example.com"
              aria-label={`대상 서버 ${String(i + 1)} 주소`}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, baseUrl: e.target.value } : v)))}
            />
            <button
              className="btn ghost"
              aria-label={`대상 서버 ${String(i + 1)} 빼기`}
              onClick={() => onChange(envs.filter((_, k) => k !== i))}
            >
              빼기
            </button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => onChange([...envs, { env: '', baseUrl: '', key: 새줄키() }])}>
          줄 더하기
        </button>
        {envs.length === 0 ? (
          <div className="hint">하나도 없으면 실행 설정에서 고를 것이 없어 실행을 못 합니다</div>
        ) : null}
      </div>
    </div>
  );
}

