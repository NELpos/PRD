// components/SQLPipelineEditorWithAI.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'

// ============================================
// AI + JWT 파이프라인 예제 쿼리
// ============================================

const EXAMPLE_QUERIES = [
  {
    title: '🔐 JWT 디코딩 기본',
    query: 'SELECT * FROM users | jwtdecode access_token',
    description: 'JWT 토큰을 디코딩하여 페이로드 확인'
  },
  {
    title: '🤖 AI 감정 분석',
    query: `SELECT * FROM customer_reviews 
| ai_sentiment review_text include_score=true
| filter review_text_sentiment = 'negative'`,
    description: '부정적인 리뷰만 필터링'
  },
  {
    title: '🌐 AI 번역 + 감정 분석',
    query: `SELECT * FROM global_feedback 
| ai_translate feedback target_lang="Korean"
| ai_sentiment feedback_translated include_score=true
| sort feedback_translated_sentiment_score asc`,
    description: '글로벌 피드백을 한국어로 번역 후 감정 분석'
  },
  {
    title: '🔒 JWT + AI 보안 분석',
    query: `SELECT * FROM api_logs 
| jwtdecode authorization 
| ai_classify user_agent categories="mobile,desktop,bot,suspicious"
| filter user_agent_category = 'suspicious' OR authorization_decoded._expired = true`,
    description: '의심스러운 활동과 만료된 토큰 탐지'
  },
  {
    title: '📊 고객 문의 자동 처리',
    query: `SELECT * FROM support_tickets 
| ai_classify message categories="urgent,billing,technical,general"
| ai_extract message fields="customer_name,issue_summary,contact_info"
| ai_sentiment message include_score=true
| filter message_category = 'urgent' OR message_sentiment_score < -0.5`,
    description: '긴급 문의 또는 부정적 문의 자동 식별'
  },
  {
    title: '📝 콘텐츠 요약 + 분류',
    query: `SELECT * FROM articles 
| ai_summarize content max_length=150 style=bullet_points
| ai_classify content categories="technology,business,lifestyle,entertainment"
| ai_extract content fields="key_topics,mentioned_companies,main_argument"
| sort created_at desc 
| limit 20`,
    description: '최신 기사 요약 및 분류'
  },
  {
    title: '🔍 복합 데이터 분석',
    query: `SELECT * FROM user_sessions 
| jwtdecode token 
| ai_extract token_payload fields="userId,role,permissions"
| ai_classify activity_log categories="normal,suspicious,malicious" include_confidence=true
| filter activity_log_category != 'normal' AND activity_log_confidence > 0.8
| select userId,role,activity_log_category,activity_log_confidence,activity_log_reasoning`,
    description: 'JWT 분석 + AI 기반 이상 행동 탐지'
  }
]

// ============================================
// 목 데이터
// ============================================

const MOCK_DATA_SETS = {
  users: [
    {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTYyMzkwMjIsImV4cCI6NDg3MTkxMzAyMn0.uj5H_qYCiLBkH7_R5rF3vD4pX9wZ2yN8mQ0jK6sT7Lc'
    },
    {
      id: 2,
      username: 'bob',
      email: 'bob@example.com',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYm9iQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjI0MjYyMn0.6gY7tR3dF8wS4xN9mQ2jK5sT7LcH_qYCiLBkH7_R5rF'
    }
  ],
  
  customer_reviews: [
    {
      id: 1,
      customer_name: '김철수',
      review_text: '제품이 정말 훌륭합니다! 배송도 빠르고 품질도 최고예요. 강력 추천합니다.',
      rating: 5
    },
    {
      id: 2,
      customer_name: '이영희',
      review_text: '배송이 너무 늦었고, 제품 포장도 엉망이었습니다. 매우 실망스러웠어요.',
      rating: 1
    },
    {
      id: 3,
      customer_name: '박민수',
      review_text: '가격 대비 괜찮은 것 같아요. 특별히 나쁘지도 좋지도 않습니다.',
      rating: 3
    }
  ],

  support_tickets: [
    {
      ticket_id: 1001,
      customer_email: 'urgent@example.com',
      message: '결제가 처리되지 않아 서비스를 사용할 수 없습니다. 즉시 해결이 필요합니다!',
      status: 'open'
    },
    {
      ticket_id: 1002,
      customer_email: 'info@example.com',
      message: '제품 사용 방법에 대해 궁금한 점이 있습니다. 매뉴얼을 보내주시겠어요?',
      status: 'open'
    }
  ],

  api_logs: [
    {
      session_id: 'sess_123',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjo0ODcxOTEzMDIyfQ.test123',
      request_body: '{"action":"read","resource":"users"}',
      ip_address: '192.168.1.1'
    },
    {
      session_id: 'sess_456',
      user_agent: 'python-requests/2.28.0',
      authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OSwicm9sZSI6ImJvdCIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjQyNjIyfQ.suspicious',
      request_body: '{"action":"delete","resource":"all"}',
      ip_address: '10.0.0.1'
    }
  ]
}

// ============================================
// React 컴포넌트
// ============================================

export default function SQLPipelineEditorWithAI() {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const [selectedExample, setSelectedExample] = useState(0)
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof MOCK_DATA_SETS>('users')
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [executionTime, setExecutionTime] = useState<number>(0)
  const [showAIWarning, setShowAIWarning] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    const startState = EditorState.create({
      doc: EXAMPLE_QUERIES[0].query,
      extensions: [
        basicSetup,
        sql(),
        EditorView.theme({
          '&': {
            height: '200px',
            fontSize: '14px'
          },
          '.cm-content': {
            fontFamily: '"Fira Code", "Monaco", monospace'
          }
        })
      ]
    })

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    })

    editorViewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  const loadExample = (index: number) => {
    setSelectedExample(index)
    if (editorViewRef.current) {
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: EXAMPLE_QUERIES[index].query
        }
      })
    }

    // AI 명령어 포함 여부 확인
    const query = EXAMPLE_QUERIES[index].query
    setShowAIWarning(
      query.includes('ai_') || 
      query.includes('ai_transform') || 
      query.includes('ai_sentiment') ||
      query.includes('ai_classify') ||
      query.includes('ai_summarize') ||
      query.includes('ai_translate') ||
      query.includes('ai_extract')
    )
  }

  const executeQuery = async () => {
    if (!editorViewRef.current) return

    setIsExecuting(true)
    setError('')
    const startTime = Date.now()

    try {
      const query = editorViewRef.current.state.doc.toString()
      const data = MOCK_DATA_SETS[selectedDataset]

      // 실제 환경에서는 API 호출
      // const response = await fetch('/api/sql-pipeline', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ query, data })
      // })
      // const result = await response.json()

      // 데모를 위한 시뮬레이션
      if (showAIWarning) {
        throw new Error('AI 명령어는 AWS Bedrock 설정이 필요합니다. AWS-SETUP-GUIDE.md를 참조하세요.')
      }

      // JWT 디코딩만 시뮬레이션
      const mockResult = simulateJWTDecode(data, query)
      
      setResults(mockResult)
      setExecutionTime(Date.now() - startTime)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsExecuting(false)
    }
  }

  // 간단한 JWT 디코딩 시뮬레이션
  const simulateJWTDecode = (data: any[], query: string) => {
    if (!query.includes('jwtdecode')) {
      return data
    }

    return data.map(row => {
      if (row.access_token || row.authorization) {
        const tokenField = row.access_token ? 'access_token' : 'authorization'
        const token = row[tokenField]
        
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            return {
              ...row,
              [`${tokenField}_payload`]: payload,
              [`${tokenField}_decoded`]: {
                ...payload,
                _expired: payload.exp ? new Date(payload.exp * 1000) < new Date() : null
              }
            }
          }
        } catch (e) {
          // 디코딩 실패
        }
      }
      return row
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 SQL Pipeline Editor
            <span className="text-2xl ml-3 text-blue-600">+ AI Power</span>
          </h1>
          <p className="text-gray-600">
            JWT 디코딩 + AWS Bedrock AI를 활용한 차세대 SQL 데이터 파이프라인
          </p>
        </div>

        {/* AI 경고 */}
        {showAIWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  AI 기능 사용을 위한 설정 필요
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>이 쿼리는 AI 파이프라인 명령어를 포함합니다. 실행하려면:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>AWS Bedrock 계정 설정</li>
                    <li>Claude Haiku 4.5 모델 접근 권한 활성화</li>
                    <li>환경 변수 설정 (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)</li>
                  </ol>
                  <p className="mt-2">
                    📖 자세한 설정 방법: <a href="#" className="underline font-semibold">AWS-SETUP-GUIDE.md</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 예제 쿼리 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📚</span>
                예제 쿼리
              </h2>
              <div className="space-y-2">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedExample === index
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold text-sm">{example.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 에디터 및 결과 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 데이터셋 선택 */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 데이터셋 선택
              </label>
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value as keyof typeof MOCK_DATA_SETS)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="users">Users (JWT 토큰 포함)</option>
                <option value="customer_reviews">Customer Reviews (리뷰 텍스트)</option>
                <option value="support_tickets">Support Tickets (고객 문의)</option>
                <option value="api_logs">API Logs (보안 로그)</option>
              </select>
              <div className="mt-2 text-xs text-gray-500">
                {MOCK_DATA_SETS[selectedDataset].length}개의 행
              </div>
            </div>

            {/* 에디터 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">⚡ 쿼리 에디터</h2>
                <button
                  onClick={executeQuery}
                  disabled={isExecuting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                >
                  {isExecuting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      실행 중...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">▶️</span>
                      실행
                    </>
                  )}
                </button>
              </div>
              
              <div 
                ref={editorRef} 
                className="border border-gray-300 rounded-lg overflow-hidden"
              />
            </div>

            {/* 에러 */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <div className="flex">
                  <span className="text-red-600 font-semibold mr-2">❌</span>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* 결과 */}
            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    ✅ 실행 결과 ({results.length}개 행)
                  </h2>
                  <div className="text-sm text-gray-500">
                    실행 시간: {executionTime}ms
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(results[0] || {}).map(key => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-blue-50">
                          {Object.entries(row).map(([key, value], colIndex) => (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="px-4 py-3 text-sm text-gray-900"
                            >
                              {typeof value === 'object' && value !== null ? (
                                <details className="cursor-pointer">
                                  <summary className="text-blue-600 hover:text-blue-800 font-medium">
                                    {key.includes('decoded') ? '🔓 디코딩됨' : 
                                     key.includes('payload') ? '📦 페이로드' : 
                                     '🔍 상세보기'}
                                  </summary>
                                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                </details>
                              ) : typeof value === 'string' && value.length > 50 ? (
                                <div className="max-w-xs">
                                  <div className="truncate" title={value}>
                                    {value}
                                  </div>
                                </div>
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 기능 소개 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🔐</div>
            <h3 className="font-semibold mb-2">JWT 디코딩</h3>
            <p className="text-sm text-gray-600">
              JWT 토큰을 자동으로 디코딩하고 만료 여부를 확인합니다.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-semibold mb-2">AI 데이터 변환</h3>
            <p className="text-sm text-gray-600">
              Claude Haiku 4.5로 감정 분석, 분류, 번역 등을 수행합니다.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold mb-2">파이프라인 체이닝</h3>
            <p className="text-sm text-gray-600">
              여러 명령어를 | 연산자로 연결하여 복잡한 변환을 수행합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
