// lib/advanced-pipeline-commands.ts

/**
 * 고급 파이프라인 커스텀 명령어 예제
 * JWT 디코딩 외에 다양한 데이터 변환 기능 제공
 */

type DataRow = Record<string, any>

// ============================================
// 1. JWT 관련 고급 명령어
// ============================================

export const jwtCommands = {
  /**
   * jwtdecode - JWT 토큰 디코딩
   * 사용법: | jwtdecode token_column
   */
  jwtdecode: (data: DataRow[], args: { column: string }) => {
    const { column } = args
    
    return data.map(row => {
      const token = row[column]
      if (!token || typeof token !== 'string') {
        return {
          ...row,
          [`${column}_decoded`]: null,
          [`${column}_error`]: 'No token found'
        }
      }

      try {
        const decoded = decodeJWT(token)
        if (!decoded) throw new Error('Invalid JWT')

        return {
          ...row,
          [`${column}_header`]: decoded.header,
          [`${column}_payload`]: decoded.payload,
          [`${column}_decoded`]: {
            ...decoded.payload,
            _expired: decoded.payload.exp ? 
              new Date(decoded.payload.exp * 1000) < new Date() : null,
            _expiresAt: decoded.payload.exp ? 
              new Date(decoded.payload.exp * 1000).toISOString() : null,
            _issuedAt: decoded.payload.iat ?
              new Date(decoded.payload.iat * 1000).toISOString() : null
          }
        }
      } catch (error) {
        return {
          ...row,
          [`${column}_decoded`]: null,
          [`${column}_error`]: error instanceof Error ? error.message : 'Decode failed'
        }
      }
    })
  },

  /**
   * jwtextract - JWT에서 특정 필드만 추출
   * 사용법: | jwtextract token_column fields=userId,email,role
   */
  jwtextract: (data: DataRow[], args: { column: string; fields: string[] }) => {
    const { column, fields } = args
    
    return data.map(row => {
      const token = row[column]
      if (!token) return row

      try {
        const decoded = decodeJWT(token)
        if (!decoded) return row

        const extracted: Record<string, any> = {}
        fields.forEach(field => {
          extracted[`${field}_from_jwt`] = decoded.payload[field]
        })

        return { ...row, ...extracted }
      } catch {
        return row
      }
    })
  },

  /**
   * jwtvalidate - JWT 유효성 검증
   * 사용법: | jwtvalidate token_column
   */
  jwtvalidate: (data: DataRow[], args: { column: string }) => {
    const { column } = args
    
    return data.map(row => {
      const token = row[column]
      const validation = {
        isValid: false,
        isExpired: null as boolean | null,
        hasRequiredFields: false,
        errors: [] as string[]
      }

      if (!token) {
        validation.errors.push('Token is missing')
        return { ...row, [`${column}_validation`]: validation }
      }

      try {
        const decoded = decodeJWT(token)
        if (!decoded) {
          validation.errors.push('Invalid JWT format')
          return { ...row, [`${column}_validation`]: validation }
        }

        validation.isValid = true

        // 만료 체크
        if (decoded.payload.exp) {
          validation.isExpired = new Date(decoded.payload.exp * 1000) < new Date()
          if (validation.isExpired) {
            validation.errors.push('Token is expired')
          }
        }

        // 필수 필드 체크
        const requiredFields = ['sub', 'iat']
        validation.hasRequiredFields = requiredFields.every(
          field => field in decoded.payload
        )

        if (!validation.hasRequiredFields) {
          validation.errors.push('Missing required fields')
        }

        return { ...row, [`${column}_validation`]: validation }
      } catch (error) {
        validation.errors.push(error instanceof Error ? error.message : 'Unknown error')
        return { ...row, [`${column}_validation`]: validation }
      }
    })
  }
}

// ============================================
// 2. 데이터 변환 명령어
// ============================================

export const transformCommands = {
  /**
   * json_parse - JSON 문자열을 객체로 파싱
   * 사용법: | json_parse metadata_column
   */
  json_parse: (data: DataRow[], args: { column: string }) => {
    const { column } = args
    
    return data.map(row => {
      try {
        const parsed = JSON.parse(row[column])
        return {
          ...row,
          [`${column}_parsed`]: parsed
        }
      } catch {
        return {
          ...row,
          [`${column}_parsed`]: null,
          [`${column}_parse_error`]: 'Invalid JSON'
        }
      }
    })
  },

  /**
   * flatten - 중첩된 객체를 평탄화
   * 사용법: | flatten nested_object_column
   */
  flatten: (data: DataRow[], args: { column: string; prefix?: string }) => {
    const { column, prefix = '' } = args
    
    const flattenObject = (obj: any, parentKey = ''): Record<string, any> => {
      let result: Record<string, any> = {}
      
      for (const key in obj) {
        const newKey = parentKey ? `${parentKey}.${key}` : key
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          result = { ...result, ...flattenObject(obj[key], newKey) }
        } else {
          result[newKey] = obj[key]
        }
      }
      
      return result
    }

    return data.map(row => {
      const value = row[column]
      if (typeof value !== 'object' || value === null) {
        return row
      }

      const flattened = flattenObject(value, prefix)
      return { ...row, ...flattened }
    })
  },

  /**
   * rename - 컬럼 이름 변경
   * 사용법: | rename old_name:new_name,another_old:another_new
   */
  rename: (data: DataRow[], args: { mappings: Record<string, string> }) => {
    const { mappings } = args
    
    return data.map(row => {
      const newRow: DataRow = {}
      
      for (const [key, value] of Object.entries(row)) {
        const newKey = mappings[key] || key
        newRow[newKey] = value
      }
      
      return newRow
    })
  },

  /**
   * select - 특정 컬럼만 선택
   * 사용법: | select id,name,email
   */
  select: (data: DataRow[], args: { columns: string[] }) => {
    const { columns } = args
    
    return data.map(row => {
      const selected: DataRow = {}
      columns.forEach(col => {
        if (col in row) {
          selected[col] = row[col]
        }
      })
      return selected
    })
  },

  /**
   * exclude - 특정 컬럼 제외
   * 사용법: | exclude password,secret_key
   */
  exclude: (data: DataRow[], args: { columns: string[] }) => {
    const { columns } = args
    
    return data.map(row => {
      const filtered: DataRow = {}
      for (const [key, value] of Object.entries(row)) {
        if (!columns.includes(key)) {
          filtered[key] = value
        }
      }
      return filtered
    })
  }
}

// ============================================
// 3. 데이터 분석 명령어
// ============================================

export const analysisCommands = {
  /**
   * stats - 통계 정보 계산
   * 사용법: | stats count,avg(age),sum(amount) by category
   */
  stats: (data: DataRow[], args: { 
    aggregations: Array<{ func: string; column?: string }>
    groupBy?: string 
  }) => {
    const { aggregations, groupBy } = args

    if (!groupBy) {
      // 전체 통계
      const result: DataRow = {}
      
      aggregations.forEach(agg => {
        const { func, column } = agg
        
        switch (func) {
          case 'count':
            result.count = data.length
            break
          case 'avg':
            if (column) {
              const values = data.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`avg_${column}`] = values.reduce((a, b) => a + b, 0) / values.length
            }
            break
          case 'sum':
            if (column) {
              const values = data.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`sum_${column}`] = values.reduce((a, b) => a + b, 0)
            }
            break
          case 'min':
            if (column) {
              const values = data.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`min_${column}`] = Math.min(...values)
            }
            break
          case 'max':
            if (column) {
              const values = data.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`max_${column}`] = Math.max(...values)
            }
            break
        }
      })
      
      return [result]
    }

    // 그룹별 통계
    const groups = new Map<any, DataRow[]>()
    
    data.forEach(row => {
      const key = row[groupBy]
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(row)
    })

    const results: DataRow[] = []
    
    groups.forEach((groupData, groupKey) => {
      const result: DataRow = { [groupBy]: groupKey }
      
      aggregations.forEach(agg => {
        const { func, column } = agg
        
        switch (func) {
          case 'count':
            result.count = groupData.length
            break
          case 'avg':
            if (column) {
              const values = groupData.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`avg_${column}`] = values.reduce((a, b) => a + b, 0) / values.length
            }
            break
          case 'sum':
            if (column) {
              const values = groupData.map(r => Number(r[column])).filter(v => !isNaN(v))
              result[`sum_${column}`] = values.reduce((a, b) => a + b, 0)
            }
            break
        }
      })
      
      results.push(result)
    })

    return results
  },

  /**
   * sort - 정렬
   * 사용법: | sort age desc
   */
  sort: (data: DataRow[], args: { column: string; order: 'asc' | 'desc' }) => {
    const { column, order } = args
    
    return [...data].sort((a, b) => {
      const aVal = a[column]
      const bVal = b[column]
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
  },

  /**
   * limit - 결과 개수 제한
   * 사용법: | limit 10
   */
  limit: (data: DataRow[], args: { count: number }) => {
    return data.slice(0, args.count)
  },

  /**
   * unique - 중복 제거
   * 사용법: | unique email
   */
  unique: (data: DataRow[], args: { column: string }) => {
    const { column } = args
    const seen = new Set()
    
    return data.filter(row => {
      const value = row[column]
      if (seen.has(value)) {
        return false
      }
      seen.add(value)
      return true
    })
  }
}

// ============================================
// 4. 데이터 보강 명령어
// ============================================

export const enrichCommands = {
  /**
   * lookup - 외부 데이터 조인
   * 사용법: | lookup user_details on user_id
   */
  lookup: async (
    data: DataRow[], 
    args: { 
      table: string
      on: string
      lookupData: DataRow[] // 실제로는 API에서 가져옴
    }
  ) => {
    const { on, lookupData } = args
    
    const lookupMap = new Map(
      lookupData.map(row => [row[on], row])
    )

    return data.map(row => {
      const lookupKey = row[on]
      const enrichData = lookupMap.get(lookupKey)
      
      return enrichData ? { ...row, ...enrichData } : row
    })
  },

  /**
   * geocode - IP 주소를 위치 정보로 변환
   * 사용법: | geocode ip_address
   */
  geocode: async (data: DataRow[], args: { column: string }) => {
    // 실제로는 GeoIP API 호출
    const { column } = args
    
    return data.map(row => ({
      ...row,
      [`${column}_location`]: {
        country: 'KR',
        city: 'Seoul',
        lat: 37.5665,
        lng: 126.9780
      }
    }))
  }
}

// ============================================
// 5. 유틸리티 함수
// ============================================

function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64] = parts

    const header = JSON.parse(base64UrlDecode(headerB64))
    const payload = JSON.parse(base64UrlDecode(payloadB64))

    return { header, payload, signature: parts[2] }
  } catch {
    return null
  }
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  base64 += padding
  
  const decoded = atob(base64)
  return decodeURIComponent(
    decoded.split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  )
}

// ============================================
// 6. 복합 예제 쿼리
// ============================================

export const exampleQueries = {
  basic: {
    title: 'JWT 디코딩 기본',
    query: 'SELECT * FROM users | jwtdecode access_token'
  },
  
  extractFields: {
    title: 'JWT에서 특정 필드만 추출',
    query: 'SELECT * FROM users | jwtextract access_token fields=userId,email,role'
  },
  
  validateAndFilter: {
    title: 'JWT 검증 후 유효한 토큰만 필터링',
    query: `SELECT * FROM users 
| jwtvalidate access_token 
| filter access_token_validation.isValid = true AND access_token_validation.isExpired = false`
  },
  
  decodeAndEnrich: {
    title: 'JWT 디코딩 후 사용자 정보 보강',
    query: `SELECT * FROM sessions 
| jwtdecode token 
| lookup user_details on userId 
| select sessionId,userId,email,role,expiresAt`
  },
  
  statsAnalysis: {
    title: 'JWT 역할별 통계',
    query: `SELECT * FROM users 
| jwtdecode access_token 
| flatten access_token_payload 
| stats count,avg(age) by role`
  },
  
  complexPipeline: {
    title: '복잡한 파이프라인 체인',
    query: `SELECT * FROM api_logs 
| jwtdecode authorization 
| json_parse request_body 
| flatten request_body_parsed 
| filter status = 200 
| exclude password,secret 
| sort timestamp desc 
| limit 100`
  },
  
  securityAudit: {
    title: '보안 감사: 만료된 토큰 찾기',
    query: `SELECT * FROM active_sessions 
| jwtvalidate token 
| filter token_validation.isExpired = true 
| select userId,sessionId,token_validation 
| sort userId`
  }
}
