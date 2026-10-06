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

export function ScenarioFields({
  idPrefix,
  fields,
  글,
  잠금,
  잠글까,
  on칸,
}: {
  idPrefix: string;
  fields: Field[];
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
                  <option value="">{t('저장값 사용')}</option>
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
                  placeholder={t('저장값 사용')}
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
