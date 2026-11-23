import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApiKey } from '../hooks/useApiKey.ts'
import { clearApiKey, maskApiKey, normalizeApiKey, setApiKey } from '../lib/apiKeyStore.ts'
import { verifyApiKey } from '../lib/nexon/verifyApiKey.ts'

type Feedback = { tone: 'success' | 'error' | 'warning'; text: string } | null

export default function SettingsPage() {
  const savedKey = useApiKey()
  const inputId = useId()
  const [input, setInput] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeApiKey(input)
    if ('error' in normalized) {
      setFeedback({ tone: 'error', text: normalized.error })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const result = await verifyApiKey(normalized.key)
      if (result.status === 'invalid') {
        setFeedback({ tone: 'error', text: result.error.userMessage })
        return
      }
      setApiKey(normalized.key)
      setInput('')
      setReveal(false)
      setFeedback(
        result.status === 'valid'
          ? { tone: 'success', text: 'API 키를 저장했습니다. 연결도 정상입니다.' }
          : { tone: 'warning', text: `API 키를 저장했지만 지금은 확인하지 못했습니다. ${result.error.userMessage}` },
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleTest() {
    if (!savedKey) return
    setBusy(true)
    setFeedback(null)
    try {
      const result = await verifyApiKey(savedKey)
      if (result.status === 'valid') setFeedback({ tone: 'success', text: '연결 정상: API 키가 올바르게 동작합니다.' })
      else if (result.status === 'invalid') setFeedback({ tone: 'error', text: result.error.userMessage })
      else setFeedback({ tone: 'warning', text: result.error.userMessage })
    } finally {
      setBusy(false)
    }
  }

  function handleDelete() {
    clearApiKey()
    setConfirmDelete(false)
    setFeedback({ tone: 'success', text: 'API 키를 삭제했습니다.' })
  }

  return (
    <section className="page">
      <h1>설정</h1>

      <h2>NEXON Open API 키</h2>
      <p className="muted">
        전적 검색에 필요합니다. 키는 이 기기에만 저장되며 NEXON Open API 호출에만 쓰입니다. 키가 없다면{' '}
        <Link to="/guide">발급 방법</Link>을 참고하세요.
      </p>

      {savedKey ? (
        <div className="panel">
          <div>
            등록된 키: <code data-testid="saved-key">{maskApiKey(savedKey)}</code>
          </div>
          <div className="row">
            <button type="button" onClick={handleTest} disabled={busy}>
              연결 테스트
            </button>
            {confirmDelete ? (
              <>
                <button type="button" className="danger" onClick={handleDelete}>
                  삭제 확인
                </button>
                <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
                  취소
                </button>
              </>
            ) : (
              <button type="button" className="secondary" onClick={() => setConfirmDelete(true)} disabled={busy}>
                키 삭제
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">등록된 키가 없습니다.</p>
      )}

      <form className="panel" onSubmit={handleSave}>
        <label htmlFor={inputId}>{savedKey ? '새 키로 바꾸기' : 'API 키 입력'}</label>
        <div className="row">
          <input
            id={inputId}
            type={reveal ? 'text' : 'password'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="발급받은 API 키를 붙여넣기"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="button" className="secondary" onClick={() => setReveal((v) => !v)}>
            {reveal ? '숨기기' : '보기'}
          </button>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? '확인 중…' : '확인 후 저장'}
        </button>
      </form>

      {feedback && (
        <p className={`feedback ${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.text}
        </p>
      )}

      <p className="muted small">Data based on NEXON Open API · 넥슨과 무관한 비공식 앱입니다.</p>
    </section>
  )
}
