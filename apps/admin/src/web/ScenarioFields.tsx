// 시나리오 단계 설정의 입력값 · 기대값 칸 그리기. 빈 칸 = 저장값 사용이라 Form 과 달리 시작값을 채우지 않는다

import { use말 } from './i18n.js';
import type { Field } from './schema.js';

/** 단계에 이미 들어 있는 값을 칸 글자로. 코드 기본값 · 저장값은 채우지 않는다 */
export function 시작글자(fields: Field[], 값: Record<string, unknown>): Record<string, string> {
  const 글: Record<string, string> = {};
  for (const f of fields) {
    const v = 값[f.key];
    글[f.key] = v === undefined ? '' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  }
  return 글;
}

const 가림글 = '********';

/**
 * 칸을 비워 두면 실행이 쓸 값을 흐린 글로. 저장값이 있으면 저장값, 없는 계정 칸은 대상 서버 계정, 그 밖은 코드 기본값, 아무것도 없으면 값 없이 「저장값 사용」.
 * 실제 값은 `schemaToFields(스키마, 저장값, 저장된 비밀)` 가 이미 가려 준 칸(`saved` · `default` · `savedSecret`)에서 읽는다 — 다시 계산하지 않는다
 */
function 비운글(t: ReturnType<typeof use말>, f: Field, 실제: Field | undefined): string {
  if (실제 === undefined) return t('저장값 사용');
  // 저장값이 없는 계정 칸은 실행이 고른 대상 서버의 역할 계정으로 채운다 — 코드 기본값보다 먼저다 (도메인/실행 §3.2)
  if (실제.saved !== true && 실제.savedSecret !== true && 실제.계정 !== undefined) {
    return t('대상 서버의 {역할} 계정 사용', { 역할: 실제.계정.role });
  }
  const 있나 = 실제.savedSecret === true || (실제.default !== undefined && 실제.default !== '');
  if (!있나) return t('저장값 사용');
  const 값 = 실제.savedSecret === true || f.secret
    ? 가림글
    : f.kind === 'boolean'
      ? t(실제.default === true ? '예' : '아니오')
      : typeof 실제.default === 'object' && 실제.default !== null
        ? JSON.stringify(실제.default)
        : String(실제.default);
  return 실제.saved === true || 실제.savedSecret === true ? t('저장값 사용 · {값}', { 값 }) : t('기본값 사용 · {값}', { 값 });
}

export function ScenarioFields({
  idPrefix,
  fields,
  실제,
  글,
  잠금,
  잠글까,
  on칸,
}: {
  idPrefix: string;
  fields: Field[];
  /** 저장값을 얹은 같은 칸들. 비워 둔 칸에 실제로 쓰일 값을 흐리게 보이는 데 쓴다. 못 받았으면 넘기지 않는다 */
  실제?: Field[];
  글: Record<string, string>;
  /** 값 연결이 채우는 칸 → 가져오는 단계 번호 */
  잠금: Record<string, number>;
  /** 읽기만 하는 사람 */
  잠글까: boolean;
  on칸: (key: string, 글: string) => void;
}) {
  const t = use말();
  return (
    <>
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const 값 = 글[f.key] ?? '';
        const 묶임 = 잠금[f.key];
        const 비움 = 비운글(t, f, 실제?.find((r) => r.key === f.key));
        return (
          <div className="field" key={f.key}>
            <label htmlFor={id} title={`${f.label} · ${f.key}`}>
              {f.label}
            </label>
            <div>
              {묶임 !== undefined ? (
                <input type="text" id={id} value={t('{번호}번 단계 값 사용', { 번호: 묶임 })} disabled readOnly />
              ) : f.kind === 'enum' || f.kind === 'boolean' ? (
                <select
                  id={id}
                  value={값}
                  disabled={잠글까}
                  onChange={(e) => on칸(f.key, e.target.value)}
                >
                  <option value="">{비움}</option>
                  {f.kind === 'boolean' ? (
                    <>
                      <option value="true">{t('예')}</option>
                      <option value="false">{t('아니오')}</option>
                    </>
                  ) : (
                    (f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type={f.secret ? 'password' : 'text'}
                  // 브라우저 비밀번호 관리자가 관리 화면 로그인 비밀번호를 끼워 넣지 못하게 한다
                  autoComplete={f.secret ? 'new-password' : 'off'}
                  id={id}
                  value={값}
                  placeholder={비움}
                  disabled={잠글까}
                  onChange={(e) => on칸(f.key, e.target.value)}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
