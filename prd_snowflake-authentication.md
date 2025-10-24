# PRD: Snowflake Key-Pair Authentication Integration for Next.js

## 1. Overview

### 1.1 Purpose
Next.js 플랫폼에서 Snowflake의 공식 Node.js Driver를 사용하여 Key-Pair Authentication 방식의 보안 연결을 구현합니다.

### 1.2 Background
- 현재 개인키를 부여받은 상황
- 패스워드 기반 인증보다 안전한 Key-Pair Authentication 필요
- REST API 직접 호출 대신 공식 Snowflake SDK 사용으로 안정성 확보

### 1.3 Goals
- Snowflake Key-Pair Authentication을 사용한 보안 연결 구현
- Next.js API Route를 통한 Snowflake 쿼리 실행 기능 제공
- 환경변수를 통한 안전한 credential 관리
- 에러 핸들링 및 연결 관리 구현

## 2. Technical Specifications

### 2.1 Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js 18+
- **Snowflake SDK**: `snowflake-sdk` (latest)
- **Language**: TypeScript

### 2.2 Dependencies
```json
{
  "dependencies": {
    "snowflake-sdk": "^1.13.1"
  },
  "devDependencies": {
    "@types/snowflake-sdk": "^1.6.0"
  }
}
```

### 2.3 Environment Variables
```bash
# .env.local

# Snowflake Account Information
SNOWFLAKE_ACCOUNT=your_account_identifier
SNOWFLAKE_USER=your_username
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_WAREHOUSE=your_warehouse

# Key-Pair Authentication
SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/rsa_key.p8
# OR (for encrypted key)
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_passphrase

# Optional: Role
SNOWFLAKE_ROLE=your_role
```

## 3. Implementation Requirements

### 3.1 File Structure
```
/app
  /api
    /snowflake
      /query
        route.ts          # 쿼리 실행 API
      /connection
        route.ts          # 연결 테스트 API
/lib
  /snowflake
    client.ts             # Snowflake 클라이언트 유틸리티
    types.ts              # TypeScript 타입 정의
/config
  snowflake.config.ts     # Snowflake 설정
```

### 3.2 Core Components

#### 3.2.1 Snowflake Configuration (`/config/snowflake.config.ts`)
```typescript
import { ConnectionOptions } from 'snowflake-sdk';

export const snowflakeConfig: Partial<ConnectionOptions> = {
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USER!,
  authenticator: 'SNOWFLAKE_JWT',
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  role: process.env.SNOWFLAKE_ROLE,
};

export function validateSnowflakeConfig(): void {
  const requiredEnvVars = [
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USER',
    'SNOWFLAKE_PRIVATE_KEY_PATH',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}
```

#### 3.2.2 Snowflake Client Utility (`/lib/snowflake/client.ts`)
```typescript
import snowflake, { Connection, Statement } from 'snowflake-sdk';
import crypto from 'crypto';
import fs from 'fs';
import { snowflakeConfig, validateSnowflakeConfig } from '@/config/snowflake.config';

export class SnowflakeClient {
  private connection: Connection | null = null;

  constructor() {
    validateSnowflakeConfig();
  }

  /**
   * 개인키 로드 및 파싱
   */
  private loadPrivateKey(): string {
    const privateKeyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH!;
    const privateKeyPassphrase = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE;

    // 파일에서 개인키 읽기
    const privateKeyFile = fs.readFileSync(privateKeyPath);

    // 개인키 객체 생성 (암호화된 경우 passphrase 포함)
    const privateKeyObject = crypto.createPrivateKey({
      key: privateKeyFile,
      format: 'pem',
      passphrase: privateKeyPassphrase || undefined,
    });

    // PEM 형식으로 export
    return privateKeyObject.export({
      format: 'pem',
      type: 'pkcs8',
    }) as string;
  }

  /**
   * Snowflake 연결 생성
   */
  async connect(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    const privateKey = this.loadPrivateKey();

    return new Promise((resolve, reject) => {
      const connection = snowflake.createConnection({
        ...snowflakeConfig,
        privateKey,
      });

      connection.connect((err, conn) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          reject(err);
        } else {
          console.log('Successfully connected to Snowflake');
          this.connection = conn;
          resolve(conn);
        }
      });
    });
  }

  /**
   * SQL 쿼리 실행
   */
  async executeQuery<T = any>(sqlText: string, binds?: any[]): Promise<T[]> {
    const connection = await this.connect();

    return new Promise((resolve, reject) => {
      connection.execute({
        sqlText,
        binds,
        complete: (err: Error | undefined, stmt: Statement, rows: T[] | undefined) => {
          if (err) {
            console.error('Query execution error:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        },
      });
    });
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeQuery<{ RESULT: number }>(
        'SELECT 1 as RESULT'
      );
      return result.length > 0 && result[0].RESULT === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      return new Promise((resolve, reject) => {
        this.connection!.destroy((err) => {
          if (err) {
            console.error('Error disconnecting from Snowflake:', err);
            reject(err);
          } else {
            console.log('Disconnected from Snowflake');
            this.connection = null;
            resolve();
          }
        });
      });
    }
  }
}

// 싱글톤 인스턴스 export
let clientInstance: SnowflakeClient | null = null;

export function getSnowflakeClient(): SnowflakeClient {
  if (!clientInstance) {
    clientInstance = new SnowflakeClient();
  }
  return clientInstance;
}
```

#### 3.2.3 TypeScript Types (`/lib/snowflake/types.ts`)
```typescript
export interface QueryRequest {
  query: string;
  binds?: any[];
}

export interface QueryResponse<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  rowCount?: number;
  executionTime?: number;
}

export interface ConnectionTestResponse {
  success: boolean;
  connected: boolean;
  message: string;
  timestamp: string;
}

export interface SnowflakeError {
  code: string;
  message: string;
  sqlState?: string;
}
```

#### 3.2.4 Query API Route (`/app/api/snowflake/query/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSnowflakeClient } from '@/lib/snowflake/client';
import { QueryRequest, QueryResponse } from '@/lib/snowflake/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Request body 파싱
    const body: QueryRequest = await request.json();
    const { query, binds } = body;

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json<QueryResponse>(
        {
          success: false,
          error: 'Query is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Snowflake 클라이언트 가져오기
    const client = getSnowflakeClient();

    // 쿼리 실행
    const data = await client.executeQuery(query, binds);
    const executionTime = Date.now() - startTime;

    // 성공 응답
    return NextResponse.json<QueryResponse>({
      success: true,
      data,
      rowCount: data.length,
      executionTime,
    });
  } catch (error: any) {
    console.error('Query execution error:', error);

    const executionTime = Date.now() - startTime;

    // 에러 응답
    return NextResponse.json<QueryResponse>(
      {
        success: false,
        error: error.message || 'Unknown error occurred',
        executionTime,
      },
      { status: 500 }
    );
  }
}

// GET 메서드는 허용하지 않음
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to execute queries.' },
    { status: 405 }
  );
}
```

#### 3.2.5 Connection Test API Route (`/app/api/snowflake/connection/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSnowflakeClient } from '@/lib/snowflake/client';
import { ConnectionTestResponse } from '@/lib/snowflake/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const client = getSnowflakeClient();
    const connected = await client.testConnection();

    const response: ConnectionTestResponse = {
      success: true,
      connected,
      message: connected
        ? 'Successfully connected to Snowflake'
        : 'Connection test failed',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: connected ? 200 : 503,
    });
  } catch (error: any) {
    console.error('Connection test error:', error);

    const response: ConnectionTestResponse = {
      success: false,
      connected: false,
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
```

## 4. Usage Examples

### 4.1 Query Execution
```typescript
// Client-side example
async function executeSnowflakeQuery(query: string) {
  const response = await fetch('/api/snowflake/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  return result;
}

// Usage
const result = await executeSnowflakeQuery(
  'SELECT * FROM my_table LIMIT 10'
);
console.log(result.data);
```

### 4.2 Parameterized Query with Binds
```typescript
const result = await fetch('/api/snowflake/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'SELECT * FROM users WHERE user_id = ? AND status = ?',
    binds: [123, 'active'],
  }),
});
```

### 4.3 Connection Test
```typescript
const response = await fetch('/api/snowflake/connection');
const status = await response.json();
console.log(status.connected); // true or false
```

## 5. Security Considerations

### 5.1 Private Key Management
- ✅ 개인키 파일은 절대 Git에 커밋하지 않음 (`.gitignore` 추가)
- ✅ 환경변수로만 경로 및 passphrase 관리
- ✅ 프로덕션 환경에서는 Secret Manager 사용 권장 (AWS Secrets Manager, GCP Secret Manager 등)
- ✅ 파일 권한을 600으로 설정 (`chmod 600 rsa_key.p8`)

### 5.2 API Route Security
- ✅ API Route는 서버 사이드에서만 실행됨 (클라이언트 노출 없음)
- ✅ 필요시 인증 미들웨어 추가 (NextAuth, JWT 등)
- ✅ Rate limiting 구현 고려
- ✅ CORS 설정 검토

### 5.3 Error Handling
- ✅ 민감한 정보가 포함된 에러 메시지 필터링
- ✅ 프로덕션 환경에서는 상세 에러 로그를 클라이언트에 노출하지 않음
- ✅ 서버 로그에만 상세 에러 기록

## 6. Testing Strategy

### 6.1 Unit Tests
```typescript
// __tests__/snowflake-client.test.ts
import { SnowflakeClient } from '@/lib/snowflake/client';

describe('SnowflakeClient', () => {
  let client: SnowflakeClient;

  beforeAll(() => {
    client = new SnowflakeClient();
  });

  test('should connect to Snowflake', async () => {
    const connection = await client.connect();
    expect(connection).toBeDefined();
  });

  test('should execute query', async () => {
    const result = await client.executeQuery('SELECT 1 as TEST');
    expect(result).toHaveLength(1);
    expect(result[0].TEST).toBe(1);
  });

  test('should test connection', async () => {
    const isConnected = await client.testConnection();
    expect(isConnected).toBe(true);
  });

  afterAll(async () => {
    await client.disconnect();
  });
});
```

### 6.2 Integration Tests
```typescript
// __tests__/api/query.test.ts
describe('POST /api/snowflake/query', () => {
  test('should execute valid query', async () => {
    const response = await fetch('http://localhost:3000/api/snowflake/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT 1 as TEST' }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  test('should return error for invalid query', async () => {
    const response = await fetch('http://localhost:3000/api/snowflake/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'INVALID SQL' }),
    });

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
```

## 7. Deployment Checklist

### 7.1 Pre-deployment
- [ ] 환경변수 모두 설정 확인
- [ ] 개인키 파일 경로가 올바른지 확인
- [ ] 개인키가 Snowflake에 등록되어 있는지 확인
  ```sql
  DESC USER your_username;
  -- RSA_PUBLIC_KEY_FP 확인
  ```
- [ ] Connection test 성공 확인
- [ ] `.gitignore`에 개인키 파일 및 `.env.local` 추가

### 7.2 Post-deployment
- [ ] 프로덕션 환경에서 연결 테스트 실행
- [ ] 로그 모니터링 설정
- [ ] 에러 알림 설정
- [ ] API 응답 시간 모니터링

## 8. Maintenance & Monitoring

### 8.1 Key Rotation
Snowflake는 최대 2개의 공개키를 지원하므로 무중단 Key Rotation 가능:

1. 새로운 키 쌍 생성
2. 새 공개키를 `RSA_PUBLIC_KEY_2`에 할당
   ```sql
   ALTER USER your_user SET RSA_PUBLIC_KEY_2='<new_public_key>';
   ```
3. 애플리케이션에 새 개인키 배포
4. 기존 키 제거
   ```sql
   ALTER USER your_user UNSET RSA_PUBLIC_KEY;
   ```

### 8.2 Logging
```typescript
// 연결 로그
console.log('[Snowflake] Connection established at', new Date().toISOString());

// 쿼리 실행 로그
console.log('[Snowflake] Query executed:', {
  query: sqlText.substring(0, 100),
  executionTime: `${executionTime}ms`,
  rowCount: rows.length,
});

// 에러 로그
console.error('[Snowflake] Error:', {
  code: error.code,
  message: error.message,
  timestamp: new Date().toISOString(),
});
```

### 8.3 Performance Monitoring
- 쿼리 실행 시간 추적
- 연결 풀 상태 모니터링
- 실패한 쿼리 추적

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue: "Private key file not found"
**Solution**: `SNOWFLAKE_PRIVATE_KEY_PATH` 환경변수 경로 확인

#### Issue: "Authentication failed"
**Solution**: 
1. 공개키가 올바르게 등록되었는지 확인
2. 개인키와 공개키 쌍이 맞는지 확인
3. Passphrase 확인 (암호화된 경우)

#### Issue: "Connection timeout"
**Solution**: 
1. 네트워크 연결 확인
2. Snowflake account identifier 확인
3. 방화벽 설정 확인

## 10. References

- [Snowflake Node.js Driver Documentation](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver)
- [Key-Pair Authentication Guide](https://docs.snowflake.com/en/user-guide/key-pair-auth)
- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## 11. Appendix

### A. .gitignore Example
```gitignore
# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Private keys
*.p8
*.pem
rsa_key*
private_key*
```

### B. package.json Scripts
```json
{
  "scripts": {
    "snowflake:test": "tsx scripts/test-snowflake-connection.ts",
    "snowflake:health": "curl http://localhost:3000/api/snowflake/connection"
  }
}
```

### C. Connection Test Script
```typescript
// scripts/test-snowflake-connection.ts
import { getSnowflakeClient } from '../lib/snowflake/client';

async function testConnection() {
  console.log('Testing Snowflake connection...');
  
  try {
    const client = getSnowflakeClient();
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      console.log('✅ Connection successful!');
    } else {
      console.log('❌ Connection failed!');
    }
    
    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
```
