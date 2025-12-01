// app/sql-editor/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { linter, Diagnostic } from '@codemirror/lint'

// ============================================
// 1. 파이프라인 명령어 타입 정의
// ============================================

type PipelineCommand = {
  name: string
  description: string
  syntax: string
  example: string
}

const PIPELINE_COMMANDS: PipelineCommand[] = [
  {
    name: 'jwtdecode',
    description: 'JWT 토큰을 디코딩하여 페이로드를 표시',
    syntax: 'jwtdecode <column_name>',
    example: 'SELECT * FROM users | jwtdecode access_token'
  },
  {
    name: 'filter',
    description: '조건에 맞는 행만 필터링',
    syntax: 'filter <condition>',
    example: 'SELECT * FROM users | filter age > 30'
  },
  {
    name: 'enrich',
    description: '다른 테이블의 데이터로 보강',
    syntax: 'enrich <source> on <key>',
    example: 'SELECT * FROM orders | enrich customers on customer_id'
  },
  {
    name: 'transform',
    description: '데이터 변환 및 새로운 컬럼 생성',
    syntax: 'transform { key: value, ... }',
    example: 'SELECT * FROM users | transform { fullName: concat(first_name, last_name) }'
  },
  {
    name: 'aggregate',
    description: '데이터 집계',
    syntax: 'aggregate <function>(<column>) by <group_column>',
    example: 'SELECT * FROM sales | aggregate sum(amount) by region'
  },
  {
    name: 'format',
    description: '출력 포맷 지정',
    syntax: 'format <type>',
    example: 'SELECT * FROM users | format json'
  }
]

// ============================================
// 2. JWT 디코딩 유틸리티
// ============================================

interface JWTPayload {
  [key: string]: any
}

function base64UrlDecode(str: string): string {
  // Base64 URL을 일반 Base64로 변환
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  
  // 패딩 추가
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  base64 += padding
  
  try {
    // Base64 디코딩
    const decoded = atob(base64)
    // UTF-8 디코딩
    return decodeURIComponent(
      decoded.split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    )
  } catch (e) {
    throw new Error('Invalid Base64 string')
  }
}

function decodeJWT(token: string): { header: any; payload: JWTPayload; signature: string } | null {
  try {
    const parts = token.split('.')
    
    if (parts.length !== 3) {
      return null
    }

    const [headerB64, payloadB64, signature] = parts

    const header = JSON.parse(base64UrlDecode(headerB64))
    const payload = JSON.parse(base64UrlDecode(payloadB64))

    return { header, payload, signature }
  } catch (error) {
    console.error('JWT decode error:', error)
    return null
  }
}

function isJWTToken(value: string): boolean {
  if (typeof value !== 'string') return false
  const parts = value.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

// ============================================
// 3. 파이프라인 실행 엔진
// ============================================

type DataRow = Record<string, any>
type CommandHandler = (data: DataRow[], args: any) => Promise<DataRow[]> | DataRow[]

class PipelineExecutor {
  private commands: Map<string, CommandHandler> = new Map()

  constructor() {
    this.registerDefaultCommands()
  }

  registerCommand(name: string, handler: CommandHandler) {
    this.commands.set(name, handler)
  }

  private registerDefaultCommands() {
    // JWT 디코딩 명령어
    this.registerCommand('jwtdecode', (data, args) => {
      const columnName = args.column
      
      return data.map(row => {
        const tokenValue = row[columnName]
        
        if (!tokenValue || !isJWTToken(tokenValue)) {
          return {
            ...row,
            [`${columnName}_decoded`]: null,
            [`${columnName}_error`]: 'Invalid JWT token'
          }
        }

        const decoded = decodeJWT(tokenValue)
        
        if (!decoded) {
          return {
            ...row,
            [`${columnName}_decoded`]: null,
            [`${columnName}_error`]: 'Failed to decode JWT'
          }
        }

        // 원본 토큰을 유지하면서 디코딩된 정보 추가
        return {
          ...row,
          [`${columnName}_header`]: decoded.header,
          [`${columnName}_payload`]: decoded.payload,
          [`${columnName}_decoded`]: {
            header: decoded.header,
            payload: decoded.payload,
            // 만료 시간 체크
            expired: decoded.payload.exp ? 
              new Date(decoded.payload.exp * 1000) < new Date() : 
              null,
            // 만료 시간 포맷팅
            expiresAt: decoded.payload.exp ? 
              new Date(decoded.payload.exp * 1000).toISOString() : 
              null
          }
        }
      })
    })

    // 필터 명령어
    this.registerCommand('filter', (data, args) => {
      const { condition } = args
      return data.filter(row => this.evaluateCondition(row, condition))
    })

    // Transform 명령어
    this.registerCommand('transform', (data, args) => {
      return data.map(row => {
        const transformed: DataRow = { ...row }
        
        for (const [key, value] of Object.entries(args.fields)) {
          // 간단한 변환 로직 (실제로는 더 복잡한 표현식 파서 필요)
          transformed[key] = typeof value === 'function' ? value(row) : value
        }
        
        return transformed
      })
    })

    // Format 명령어
    this.registerCommand('format', (data, args) => {
      // 포맷 타입에 따라 데이터 변환 (실제로는 UI에서 처리)
      return data
    })
  }

  private evaluateCondition(row: DataRow, condition: string): boolean {
    // 간단한 조건 평가 (실제로는 더 복잡한 파서 필요)
    try {
      // 예: "age > 30" -> row.age > 30
      const conditionFn = new Function('row', `with(row) { return ${condition} }`)
      return conditionFn(row)
    } catch {
      return true
    }
  }

  parsePipeline(pipelineStage: string): { command: string; args: any } {
    const trimmed = pipelineStage.trim()
    const tokens = trimmed.split(/\s+/)
    const command = tokens[0]
    const rest = tokens.slice(1).join(' ')

    // 각 명령어별 파싱 로직
    switch (command) {
      case 'jwtdecode':
        return {
          command,
          args: { column: tokens[1] }
        }
      
      case 'filter':
        return {
          command,
          args: { condition: rest }
        }
      
      case 'transform':
        // transform { name: concat(first, last) } 형식 파싱
        return {
          command,
          args: { fields: this.parseTransformFields(rest) }
        }
      
      case 'format':
        return {
          command,
          args: { type: tokens[1] || 'json' }
        }
      
      default:
        return { command, args: { raw: rest } }
    }
  }

  private parseTransformFields(fieldsStr: string): Record<string, any> {
    // 간단한 파싱 (실제로는 더 정교한 파서 필요)
    try {
      return JSON.parse(fieldsStr.replace(/(\w+):/g, '"$1":'))
    } catch {
      return {}
    }
  }

  async execute(query: string, mockData?: DataRow[]): Promise<DataRow[]> {
    const parts = query.split('|')
    const sqlPart = parts[0].trim()
    const pipelineParts = parts.slice(1)

    // 1. SQL 실행 (여기서는 목 데이터 사용)
    let data = mockData || await this.executeMockSQL(sqlPart)

    // 2. 파이프라인 단계별 실행
    for (const pipelineStage of pipelineParts) {
      const { command, args } = this.parsePipeline(pipelineStage)
      const handler = this.commands.get(command)

      if (!handler) {
        throw new Error(`Unknown pipeline command: ${command}`)
      }

      data = await handler(data, args)
    }

    return data
  }

  private async executeMockSQL(sql: string): Promise<DataRow[]> {
    // 목 데이터 반환 (실제로는 API 호출)
    return []
  }
}

// ============================================
// 4. CodeMirror 자동완성
// ============================================

function pipelineCompletion(context: CompletionContext) {
  const word = context.matchBefore(/[\w]*/)
  if (!word) return null

  // 파이프 기호 뒤에 있는지 확인
  const beforeCursor = context.state.doc.sliceString(0, context.pos)
  const lastPipe = beforeCursor.lastIndexOf('|')
  
  if (lastPipe === -1) return null

  const afterPipe = beforeCursor.slice(lastPipe + 1).trim()
  
  // 파이프 바로 뒤거나 명령어 입력 중인 경우
  if (afterPipe === '' || word.from > lastPipe) {
    return {
      from: word.from,
      options: PIPELINE_COMMANDS.map(cmd => ({
        label: cmd.name,
        type: 'keyword',
        info: cmd.description,
        detail: cmd.syntax,
        apply: (view: EditorView, completion: any, from: number, to: number) => {
          view.dispatch({
            changes: { from, to, insert: cmd.name + ' ' }
          })
        }
      }))
    }
  }

  return null
}

// ============================================
// 5. CodeMirror Linter
// ============================================

function pipelineLinter(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const text = view.state.doc.toString()
  const parts = text.split('|')

  // 파이프라인 부분 검증
  parts.slice(1).forEach((part, index) => {
    const trimmed = part.trim()
    const command = trimmed.split(/\s+/)[0]
    
    const validCommand = PIPELINE_COMMANDS.find(cmd => cmd.name === command)
    
    if (trimmed && !validCommand) {
      const pipeIndex = text.indexOf('|', index > 0 ? text.indexOf('|') + 1 : 0)
      const commandStart = pipeIndex + part.indexOf(command) + 1
      
      diagnostics.push({
        from: commandStart,
        to: commandStart + command.length,
        severity: 'error',
        message: `Unknown pipeline command: "${command}". Available: ${PIPELINE_COMMANDS.map(c => c.name).join(', ')}`
      })
    }
  })

  return diagnostics
}

// ============================================
// 6. React 컴포넌트
// ============================================

export default function SQLPipelineEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const [results, setResults] = useState<DataRow[]>([])
  const [error, setError] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)
  const executorRef = useRef(new PipelineExecutor())

  // 목 데이터
  const mockData: DataRow[] = [
    {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwidXNlcklkIjoxLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTYyMzkwMjIsImV4cCI6MTc0Nzc3NTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      age: 30
    },
    {
      id: 2,
      username: 'jane_smith',
      email: 'jane@example.com',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgU21pdGgiLCJ1c2VySWQiOjIsImVtYWlsIjoiamFuZUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzE2MjM5MDIyLCJleHAiOjE3NDc3NzUwMjJ9.4pC8xHXr8s9vK2PnR7jF6wQx3Yz5tM8nL4vB2qA1cDe',
      age: 25
    },
    {
      id: 3,
      username: 'bob_wilson',
      email: 'bob@example.com',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NTU1IiwibmFtZSI6IkJvYiBXaWxzb24iLCJ1c2VySWQiOjMsImVtYWlsIjoiYm9iQGV4YW1wbGUuY29tIiwicm9sZSI6Im1vZGVyYXRvciIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjoxNzQ3Nzc1MDIyfQ.XmNvM8qJ7rK5sT9wL2pB3cF6yD4xA1eH8gV0nU9iO7j',
      age: 35
    }
  ]

  useEffect(() => {
    if (!editorRef.current) return

    const startState = EditorState.create({
      doc: 'SELECT * FROM users | jwtdecode access_token',
      extensions: [
        basicSetup,
        sql(),
        autocompletion({
          override: [pipelineCompletion]
        }),
        linter(pipelineLinter),
        EditorView.theme({
          '&': {
            height: '300px',
            fontSize: '14px'
          },
          '.cm-content': {
            fontFamily: '"Fira Code", "Monaco", monospace'
          },
          '.cm-gutters': {
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #ddd'
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

  const executeQuery = async () => {
    if (!editorViewRef.current) return

    setIsExecuting(true)
    setError('')

    try {
      const query = editorViewRef.current.state.doc.toString()
      const result = await executorRef.current.execute(query, mockData)
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SQL Pipeline Editor
          </h1>
          <p className="text-gray-600">
            Splunk 스타일 파이프라인으로 SQL 결과를 변환하세요
          </p>
        </div>

        {/* 사용 가능한 명령어 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">사용 가능한 파이프라인 명령어</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PIPELINE_COMMANDS.map(cmd => (
              <div key={cmd.name} className="border border-gray-200 rounded p-3">
                <div className="font-mono text-blue-600 font-semibold">{cmd.name}</div>
                <div className="text-sm text-gray-600 mt-1">{cmd.description}</div>
                <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                  {cmd.syntax}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 에디터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">쿼리 에디터</h2>
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isExecuting ? '실행 중...' : '실행 (Ctrl+Enter)'}
            </button>
          </div>
          
          <div 
            ref={editorRef} 
            className="border border-gray-300 rounded-lg overflow-hidden"
          />

          <div className="mt-3 text-sm text-gray-500">
            💡 파이프(|) 뒤에서 자동완성을 사용하려면 <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+Space</kbd>를 누르세요
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-red-600 font-semibold mr-2">❌ Error:</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 결과 */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              실행 결과 ({results.length}개 행)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(results[0] || {}).map(key => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {Object.entries(row).map(([key, value], colIndex) => (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className="px-6 py-4 text-sm text-gray-900"
                        >
                          {typeof value === 'object' && value !== null ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:text-blue-800">
                                {key.includes('decoded') ? '🔓 디코딩된 JWT' : 'Object'}
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </details>
                          ) : typeof value === 'string' && value.length > 50 ? (
                            <div className="max-w-md">
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

        {/* 예제 쿼리 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 예제 쿼리</h3>
          <div className="space-y-2">
            <code className="block bg-white p-3 rounded text-sm font-mono">
              SELECT * FROM users | jwtdecode access_token
            </code>
            <code className="block bg-white p-3 rounded text-sm font-mono">
              SELECT * FROM users | jwtdecode access_token | filter age &gt; 25
            </code>
            <code className="block bg-white p-3 rounded text-sm font-mono">
              SELECT * FROM users | jwtdecode access_token | format json
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
