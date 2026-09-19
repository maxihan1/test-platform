// 실행 설정 화면 (SPEC §8.2). 케이스의 paramSchema·expectedSchema를 읽어 입력 폼을 자동으로 만든다
// 이 플랫폼의 핵심 — 코드를 고치지 않고 값만 바꿔 다시 돌리는 자리다

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError, type CaseRow, type ParamSetRow, type Platform } from './api.js';
import { Form } from './Form.js';
import { initialText, schemaToFields, toValues } from './schema.js';
import { Failed, Loading, message, PLATFORM_LABEL, useAsync } from './ui.js';
import { fieldErrors, messagesByKey } from './validation.js';

const EMPTY: Record<string, string> = {};

export function RunSetup({ tcId }: { tcId: string }) {
  const found = useAsync<CaseRow>(() => api.caseOf(tcId), [tcId]);
  const saved = useAsync<{ items: ParamSetRow[] }>(() => api.paramSets(tcId), [tcId]);

  const [paramText, setParamText] = useState<Record<string, string>>(EMPTY);
  const [expectedText, setExpectedText] = useState<Record<string, string>>(EMPTY);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [title, setTitle] = useState('');
  const [setName, setSetName] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<{ params: Record<string, string>; expected: Record<string, string> }>(
    { params: EMPTY, expected: EMPTY },
  );
  const [busy, setBusy] = useState(false);

  const row = found.data;
  const paramFields = useMemo(() => (row === null ? [] : schemaToFields(row.paramSchema)), [row]);
  const expectedFields = useMemo(() => (row === null ? [] : schemaToFields(row.expectedSchema)), [row]);

  // 케이스가 도착하면 default 값으로 칸을 채우고, 선언된 디바이스를 전부 고른다 (SPEC §8.2)
  useEffect(() => {
    if (row === null) return;
    setParamText(initialText(schemaToFields(row.paramSchema)));
    setExpectedText(initialText(schemaToFields(row.expectedSchema)));
    setPlatforms(row.platforms);
    setTitle(`${row.tcId} 실행`);
  }, [row]);

  if (found.error !== null) return <Failed error={found.error} />;
  if (row === null) return <Loading />;

  const params = toValues(paramFields, paramText);
  const expected = toValues(expectedFields, expectedText);
  const localErrors = {
    params: fieldErrors(row.paramSchema, params),
    expected: fieldErrors(row.expectedSchema, expected),
  };
  const shown = showErrors
    ? localErrors
    : { params: serverErrors.params, expected: serverErrors.expected };
  const broken = Object.keys(localErrors.params).length + Object.keys(localErrors.expected).length;

  function edit(which: 'params' | 'expected') {
    return (key: string, value: string) => {
      setNotice(null);
      setServerErrors({ params: EMPTY, expected: EMPTY });
      const setter = which === 'params' ? setParamText : setExpectedText;
      setter((prev) => ({ ...prev, [key]: value }));
    };
  }

  function loadSet(id: string) {
    const picked = saved.data?.items.find((item) => String(item.id) === id);
    if (picked === undefined) return;
    // 저장된 값에 없는 칸은 지금 칸의 값을 그대로 둔다. 통째로 갈아끼우면 스키마가 늘었을 때 칸이 빈다
    setParamText((prev) => ({ ...prev, ...textOf(picked.params) }));
    setExpectedText((prev) => ({ ...prev, ...textOf(picked.expected) }));
    setNotice(null);
  }

  // 위의 null 검사로 좁혀진 row를 그대로 쓰려면 화살표여야 한다. function 선언은 끌어올려져 좁힘이 풀린다
  const run = async () => {
    setShowErrors(true);
    if (broken > 0) return;
    if (platforms.length === 0) {
      setNotice('실행할 디바이스를 하나 이상 고르세요.');
      return;
    }

    setBusy(true);
    try {
      const { runId } = await api.createRun({
        title: title.trim() === '' ? `${row.tcId} 실행` : title.trim(),
        items: [{ tcId: row.tcId, platforms, params, expected }],
      });
      window.location.hash = `#/runs/${runId}`;
    } catch (err) {
      setNotice(message(err));
    } finally {
      setBusy(false);
    }
  };

  const saveSet = async () => {
    setShowErrors(true);
    if (setName.trim() === '') {
      setNotice('저장할 이름을 적으세요.');
      return;
    }

    setBusy(true);
    try {
      await api.saveParamSet(row.tcId, { name: setName.trim(), params, expected });
      setSetName('');
      setNotice(`'${setName.trim()}'으로 저장했습니다.`);
      saved.reload();
    } catch (err) {
      // 서버가 칸별 사유를 돌려주면 그 칸 아래에 붙인다 (SPEC §8.2)
      if (err instanceof ApiError && err.violations.length > 0) {
        const byKey = messagesByKey(err.violations);
        setServerErrors({
          params: pick(byKey, paramFields.map((f) => f.key)),
          expected: pick(byKey, expectedFields.map((f) => f.key)),
        });
        setShowErrors(false);
        setNotice('입력값이 명세와 맞지 않습니다.');
      } else {
        setNotice(message(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="case-tc">{row.tcId}</div>
          <div className="case-name">{row.name}</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">사전조건</div>
        {row.precondition.length === 0 ? (
          <p className="hint">선언된 사전조건이 없습니다.</p>
        ) : (
          row.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>

      <div className="sec">
        <div className="sec-h">
          <span>입력값</span>
          {saved.data === null || saved.data.items.length === 0 ? null : (
            <select defaultValue="" onChange={(e) => loadSet(e.target.value)}>
              <option value="">저장된 입력값 세트 불러오기</option>
              {saved.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Form
          idPrefix="p"
          fields={paramFields}
          text={paramText}
          errors={shown.params}
          onChange={edit('params')}
        />
        {paramFields.length === 0 ? null : (
          <p className="hint">입력값은 이번 실행 기록에 그대로 저장됩니다.</p>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">기대결과</div>
        <Form
          idPrefix="e"
          fields={expectedFields}
          text={expectedText}
          errors={shown.expected}
          onChange={edit('expected')}
        />
      </div>

      <div className="sec">
        <div className="sec-h">디바이스</div>
        <div className="checks">
          {row.platforms.map((platform) => (
            <label key={platform}>
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={(e) =>
                  setPlatforms((prev) =>
                    e.target.checked ? [...prev, platform] : prev.filter((p) => p !== platform),
                  )
                }
              />
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </div>
        <div className="field" style={{ marginTop: '10px' }}>
          <label htmlFor="run-title">실행 제목</label>
          <div>
            <input type="text" id="run-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="actions">
        <span className="note" style={notice === null ? undefined : { color: 'var(--fail)' }}>
          {notice ?? '입력값을 바꿔 다시 실행해도 코드는 고치지 않습니다.'}
        </span>
        <input
          type="text"
          placeholder="세트 이름"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          style={{ width: '140px' }}
        />
        <button className="btn ghost" onClick={() => void saveSet()} disabled={busy}>
          입력값 세트로 저장
        </button>
        <button className="btn" onClick={() => void run()} disabled={busy}>
          실행하기
        </button>
      </div>
    </div>
  );
}

function textOf(values: Record<string, unknown>): Record<string, string> {
  const text: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    text[key] = value === null || value === undefined ? '' : String(value);
  }
  return text;
}

function pick(all: Record<string, string>, keys: string[]): Record<string, string> {
  const some: Record<string, string> = {};
  for (const key of keys) {
    const found = all[key];
    if (found !== undefined) some[key] = found;
  }
  return some;
}
