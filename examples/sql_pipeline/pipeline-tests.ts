// __tests__/pipeline-executor.test.ts

/**
 * JWT 디코딩 파이프라인 테스트
 */

import { describe, test, expect } from '@jest/globals'

// ============================================
// 테스트용 목 데이터
// ============================================

const mockUsers = [
  {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    // 실제 유효한 JWT (테스트용 - 만료 시간이 먼 미래)
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcklkIjoxLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzE2MjM5MDIyLCJleHAiOjQ4NzE5MTMwMjJ9.uj5H_qYCiLBkH7_R5rF3vD4pX9wZ2yN8mQ0jK6sT7Lc',
    age: 28
  },
  {
    id: 2,
    username: 'bob',
    email: 'bob@example.com',
    // 만료된 JWT (과거 날짜)
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidXNlcklkIjoyLCJlbWFpbCI6ImJvYkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9.6gY7tR3dF8wS4xN9mQ2jK5sT7LcH_qYCiLBkH7_R5rF',
    age: 35
  },
  {
    id: 3,
    username: 'charlie',
    email: 'charlie@example.com',
    access_token: 'invalid-jwt-token',
    age: 42
  }
]

// ============================================
// 테스트 케이스
// ============================================

describe('JWT Pipeline Commands', () => {
  
  describe('jwtdecode', () => {
    test('유효한 JWT를 정확히 디코딩', () => {
      const result = jwtdecode(mockUsers.slice(0, 1), { column: 'access_token' })
      
      expect(result[0]).toHaveProperty('access_token_header')
      expect(result[0]).toHaveProperty('access_token_payload')
      expect(result[0]).toHaveProperty('access_token_decoded')
      
      expect(result[0].access_token_payload).toMatchObject({
        userId: 1,
        email: 'alice@example.com',
        role: 'admin'
      })
    })

    test('만료된 JWT를 정확히 감지', () => {
      const result = jwtdecode(mockUsers.slice(1, 2), { column: 'access_token' })
      
      expect(result[0].access_token_decoded._expired).toBe(true)
    })

    test('잘못된 JWT에 대해 에러 정보 반환', () => {
      const result = jwtdecode(mockUsers.slice(2, 3), { column: 'access_token' })
      
      expect(result[0]).toHaveProperty('access_token_error')
      expect(result[0].access_token_decoded).toBeNull()
    })
  })

  describe('jwtextract', () => {
    test('JWT에서 특정 필드만 추출', () => {
      const result = jwtextract(
        mockUsers.slice(0, 1), 
        { column: 'access_token', fields: ['userId', 'email', 'role'] }
      )
      
      expect(result[0]).toHaveProperty('userId_from_jwt', 1)
      expect(result[0]).toHaveProperty('email_from_jwt', 'alice@example.com')
      expect(result[0]).toHaveProperty('role_from_jwt', 'admin')
    })
  })

  describe('jwtvalidate', () => {
    test('유효한 JWT 검증', () => {
      const result = jwtvalidate(mockUsers.slice(0, 1), { column: 'access_token' })
      
      expect(result[0].access_token_validation.isValid).toBe(true)
      expect(result[0].access_token_validation.isExpired).toBe(false)
      expect(result[0].access_token_validation.errors).toHaveLength(0)
    })

    test('만료된 JWT 검증', () => {
      const result = jwtvalidate(mockUsers.slice(1, 2), { column: 'access_token' })
      
      expect(result[0].access_token_validation.isValid).toBe(true)
      expect(result[0].access_token_validation.isExpired).toBe(true)
      expect(result[0].access_token_validation.errors).toContain('Token is expired')
    })

    test('잘못된 JWT 검증', () => {
      const result = jwtvalidate(mockUsers.slice(2, 3), { column: 'access_token' })
      
      expect(result[0].access_token_validation.isValid).toBe(false)
      expect(result[0].access_token_validation.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('Pipeline Chaining', () => {
  test('여러 파이프라인 명령어를 체인으로 실행', async () => {
    const executor = new PipelineExecutor()
    
    const query = `
      SELECT * FROM users 
      | jwtdecode access_token 
      | filter access_token_decoded._expired = false 
      | select id,username,email,access_token_payload
    `
    
    const result = await executor.execute(query, mockUsers)
    
    // 유효한 토큰만 남음 (alice만)
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('alice')
    expect(result[0]).not.toHaveProperty('age') // select로 제외됨
  })

  test('JWT 디코딩 후 통계 계산', async () => {
    const executor = new PipelineExecutor()
    
    const query = `
      SELECT * FROM users 
      | jwtdecode access_token 
      | flatten access_token_payload 
      | stats count,avg(age) by role
    `
    
    const result = await executor.execute(query, mockUsers)
    
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('role')
    expect(result[0]).toHaveProperty('count')
  })
})

describe('Error Handling', () => {
  test('존재하지 않는 컬럼에 대한 처리', () => {
    const result = jwtdecode(mockUsers, { column: 'non_existent_column' })
    
    result.forEach(row => {
      expect(row).toHaveProperty('non_existent_column_error')
    })
  })

  test('빈 데이터셋 처리', () => {
    const result = jwtdecode([], { column: 'access_token' })
    
    expect(result).toEqual([])
  })
})

// ============================================
// 통합 테스트 시나리오
// ============================================

describe('Real-world Scenarios', () => {
  test('보안 감사: 만료된 세션 찾기', async () => {
    const executor = new PipelineExecutor()
    
    const query = `
      SELECT * FROM users 
      | jwtvalidate access_token 
      | filter access_token_validation.isExpired = true 
      | select username,email,access_token_validation
    `
    
    const result = await executor.execute(query, mockUsers)
    
    // bob의 토큰만 만료됨
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('bob')
  })

  test('역할별 사용자 통계', async () => {
    const executor = new PipelineExecutor()
    
    const query = `
      SELECT * FROM users 
      | jwtdecode access_token 
      | jwtextract access_token fields=role 
      | stats count by role_from_jwt
    `
    
    const result = await executor.execute(query, mockUsers)
    
    expect(result.some(r => r.role_from_jwt === 'admin')).toBe(true)
  })

  test('유효한 관리자 세션만 필터링', async () => {
    const executor = new PipelineExecutor()
    
    const query = `
      SELECT * FROM users 
      | jwtdecode access_token 
      | jwtvalidate access_token 
      | filter access_token_payload.role = 'admin' AND access_token_validation.isExpired = false
    `
    
    const result = await executor.execute(query, mockUsers)
    
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('alice')
  })
})

// ============================================
// JWT 생성 헬퍼 (테스트용)
// ============================================

export function createTestJWT(payload: any, expiresInDays: number = 365): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInDays * 24 * 60 * 60)
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload))
  
  // 간단한 서명 (실제 프로덕션에서는 절대 사용하지 말 것!)
  const signature = 'test-signature-do-not-use-in-production'

  return `${headerB64}.${payloadB64}.${signature}`
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    )
  )
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ============================================
// 사용 예제
// ============================================

export const usageExamples = {
  example1: () => {
    console.log('=== 예제 1: 기본 JWT 디코딩 ===')
    
    const data = [
      {
        userId: 1,
        token: createTestJWT({ userId: 1, role: 'admin', email: 'admin@test.com' })
      }
    ]
    
    const result = jwtdecode(data, { column: 'token' })
    console.log(JSON.stringify(result, null, 2))
  },

  example2: () => {
    console.log('=== 예제 2: 만료된 토큰 감지 ===')
    
    const data = [
      {
        userId: 1,
        token: createTestJWT({ userId: 1 }, -1) // 어제 만료
      }
    ]
    
    const result = jwtvalidate(data, { column: 'token' })
    console.log(JSON.stringify(result, null, 2))
  },

  example3: async () => {
    console.log('=== 예제 3: 복잡한 파이프라인 ===')
    
    const executor = new PipelineExecutor()
    const data = [
      {
        id: 1,
        token: createTestJWT({ userId: 1, role: 'admin', permissions: ['read', 'write'] }),
        age: 30
      },
      {
        id: 2,
        token: createTestJWT({ userId: 2, role: 'user', permissions: ['read'] }),
        age: 25
      }
    ]
    
    const result = await executor.execute(
      'SELECT * FROM users | jwtdecode token | filter age > 27',
      data
    )
    
    console.log(JSON.stringify(result, null, 2))
  }
}

// 테스트 실행
if (require.main === module) {
  usageExamples.example1()
  usageExamples.example2()
  usageExamples.example3()
}
