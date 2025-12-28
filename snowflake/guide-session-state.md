# Snowflake Node.js SDK - getSessionState() 상세 분석 및 세션 정보 조회 가이드

## 목차
- [문제 상황](#문제-상황)
- [getSessionState()의 실제 동작](#getsessionstate의-실제-동작)
- [왜 null이 반환되는가](#왜-null이-반환되는가)
- [확실한 해결 방법](#확실한-해결-방법)
- [디버깅 가이드](#디버깅-가이드)
- [베스트 프랙티스](#베스트-프랙티스)
- [전체 예제 코드](#전체-예제-코드)

---

## 문제 상황

`getSessionState()`를 호출했을 때 warehouse, database, schema, role이 모두 `null` 또는 `undefined`로 반환되는 경우:

```javascript
connection.execute({
  sqlText: 'SELECT * FROM my_table',
  complete: function(err, stmt, rows) {
    if (!err) {
      const sessionState = stmt.getSessionState();
      console.log(sessionState); 
      // 결과: { warehouse: null, database: null, schema: null, role: null }
      // 또는: undefined
    }
  }
});
```

---

## getSessionState()의 실제 동작

### TypeScript 정의

```typescript
/**
 * Returns an object that contains information about the values of
 * the current warehouse, current database, etc.,
 * when this statement finished executing.
 */
getSessionState(): object | undefined;
```

### 중요한 특징

1. **반환 타입**: `object | undefined` - 항상 값을 반환한다는 보장이 없음
2. **조건부 반환**: "when this statement finished executing" - 쿼리가 완전히 실행 완료된 후에만 의미 있는 값 반환
3. **내부 구현 의존**: Snowflake 서버가 세션 상태 정보를 응답에 포함시킬 때만 사용 가능

### 실제 동작 방식

`getSessionState()`는 다음과 같은 경우에 유용한 정보를 반환하지 못할 수 있습니다:

```javascript
// Case 1: 쿼리 실행 전
const stmt = connection.execute({...});
stmt.getSessionState(); // undefined - 아직 실행 안됨

// Case 2: 특정 쿼리 타입
connection.execute({
  sqlText: 'SHOW TABLES', // DDL/메타데이터 쿼리
  complete: function(err, stmt, rows) {
    const sessionState = stmt.getSessionState();
    // null 또는 불완전한 정보 반환 가능
  }
});

// Case 3: 세션 컨텍스트가 설정되지 않은 상태
connection.execute({
  sqlText: 'SELECT 1', // warehouse 불필요한 쿼리
  complete: function(err, stmt, rows) {
    const sessionState = stmt.getSessionState();
    // warehouse: null 가능
  }
});
```

---

## 왜 null이 반환되는가

### 1. 연결 시 컨텍스트 미설정

```javascript
// ❌ 문제: warehouse/database/schema 미지정
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password'
  // warehouse, database, schema 없음!
});

connection.connect((err, conn) => {
  connection.execute({
    sqlText: 'SELECT 1',
    complete: function(err, stmt, rows) {
      const sessionState = stmt.getSessionState();
      console.log(sessionState);
      // { warehouse: null, database: null, schema: null, ... }
    }
  });
});
```

**원인**: 연결 옵션에서 warehouse, database, schema를 지정하지 않으면 세션에 이러한 컨텍스트가 설정되지 않습니다.

**Snowflake 공식 문서**:
> "Some connection options assume that the specified database object (database, schema, warehouse, or role) already exists in the system. **If the specified object does not exist, a default is not set during connection.**"

### 2. 권한 문제

```javascript
// ❌ 문제: Role이 warehouse 사용 권한 없음
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  warehouse: 'MY_WAREHOUSE', // 지정은 했지만...
  role: 'LIMITED_ROLE' // 이 role이 MY_WAREHOUSE 사용 권한 없음
});
```

**해결**:
```sql
-- SYSADMIN 또는 상위 Role로 실행
GRANT USAGE ON WAREHOUSE MY_WAREHOUSE TO ROLE LIMITED_ROLE;
```

### 3. Warehouse가 생성되지 않음

```javascript
// ❌ 문제: warehouse가 존재하지 않음
const connection = snowflake.createConnection({
  warehouse: 'NON_EXISTENT_WAREHOUSE'
  // ...
});

// 에러 발생:
// "No active warehouse selected in the current session. 
//  Select an active warehouse with the 'use warehouse' command."
```

### 4. getSessionState()의 구현 제한

`getSessionState()`는 Snowflake 서버의 응답에 포함된 세션 상태 정보에 의존합니다. 모든 쿼리 응답에 이 정보가 포함되는 것은 아닙니다.

```javascript
// 서버 응답에 세션 상태가 없는 경우
connection.execute({
  sqlText: 'DESCRIBE TABLE my_table',
  complete: function(err, stmt, rows) {
    const sessionState = stmt.getSessionState();
    // undefined 또는 불완전한 정보
  }
});
```

---

## 확실한 해결 방법

### ✅ 방법 1: Context Functions 사용 (권장)

Snowflake의 **Context Functions**를 직접 쿼리하여 세션 정보를 확실하게 가져옵니다.

```javascript
async function getSessionInfo(connection) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: `
        SELECT 
          CURRENT_WAREHOUSE() as warehouse,
          CURRENT_DATABASE() as database,
          CURRENT_SCHEMA() as schema,
          CURRENT_ROLE() as role,
          CURRENT_USER() as user,
          CURRENT_ACCOUNT() as account,
          CURRENT_SESSION() as session_id
      `,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          // rows[0]에 모든 세션 정보가 담김
          resolve(rows[0]);
        }
      }
    });
  });
}

// 사용 예제
async function main() {
  const connection = snowflake.createConnection({
    account: 'your_account',
    username: 'your_username',
    password: 'your_password',
    warehouse: 'COMPUTE_WH',
    database: 'MY_DB',
    schema: 'PUBLIC',
    role: 'ANALYST'
  });

  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  try {
    const sessionInfo = await getSessionInfo(connection);
    
    console.log('=== 현재 세션 정보 ===');
    console.log('Warehouse:', sessionInfo.WAREHOUSE);
    console.log('Database:', sessionInfo.DATABASE);
    console.log('Schema:', sessionInfo.SCHEMA);
    console.log('Role:', sessionInfo.ROLE);
    console.log('User:', sessionInfo.USER);
    console.log('Account:', sessionInfo.ACCOUNT);
    console.log('Session ID:', sessionInfo.SESSION_ID);
    
    // 실제 값이 보장됨:
    // Warehouse: 'COMPUTE_WH'
    // Database: 'MY_DB'
    // Schema: 'PUBLIC'
    // Role: 'ANALYST'
    
  } catch (error) {
    console.error('Failed to get session info:', error.message);
  } finally {
    connection.destroy();
  }
}

main();
```

### Context Functions 목록

| Function | 설명 | 예제 반환값 |
|----------|------|-------------|
| `CURRENT_WAREHOUSE()` | 현재 warehouse 이름 | `'COMPUTE_WH'` |
| `CURRENT_DATABASE()` | 현재 database 이름 | `'MY_DB'` |
| `CURRENT_SCHEMA()` | 현재 schema 이름 | `'PUBLIC'` |
| `CURRENT_ROLE()` | 현재 role 이름 | `'ANALYST'` |
| `CURRENT_USER()` | 현재 사용자 이름 | `'JOHN_DOE'` |
| `CURRENT_ACCOUNT()` | 현재 account 식별자 | `'ABC12345'` |
| `CURRENT_SESSION()` | 현재 세션 ID | `12345678901234` |
| `CURRENT_REGION()` | 현재 리전 | `'AWS_US_WEST_2'` |

### ✅ 방법 2: 연결 옵션 명시 + 검증

연결 시 모든 컨텍스트를 명시하고 USE 명령으로 확인합니다.

```javascript
async function connectWithContext() {
  const connection = snowflake.createConnection({
    account: 'your_account',
    username: 'your_username',
    password: 'your_password',
    // 모든 컨텍스트 명시
    warehouse: 'COMPUTE_WH',
    database: 'MY_DB',
    schema: 'PUBLIC',
    role: 'ANALYST',
    // 세션 유지
    clientSessionKeepAlive: true
  });

  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  // 컨텍스트 명시적 설정 (보험)
  await executeQuery(connection, 'USE ROLE ANALYST');
  await executeQuery(connection, 'USE WAREHOUSE COMPUTE_WH');
  await executeQuery(connection, 'USE DATABASE MY_DB');
  await executeQuery(connection, 'USE SCHEMA PUBLIC');

  // 검증
  const sessionInfo = await getSessionInfo(connection);
  console.log('Verified session context:', sessionInfo);

  return connection;
}

function executeQuery(connection, sqlText) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sqlText,
      complete: function(err, stmt, rows) {
        if (err) reject(err);
        else resolve({ stmt, rows });
      }
    });
  });
}
```

### ✅ 방법 3: 쿼리 전 Context 확인

실제 비즈니스 쿼리 실행 전에 Context Functions로 확인:

```javascript
async function executeWithContextCheck(connection, sqlText) {
  // 1. 먼저 세션 정보 확인
  const sessionInfo = await getSessionInfo(connection);
  
  // 2. 필요한 컨텍스트 검증
  if (!sessionInfo.WAREHOUSE) {
    throw new Error('No active warehouse. Please set a warehouse.');
  }
  
  if (!sessionInfo.DATABASE) {
    throw new Error('No active database. Please set a database.');
  }

  console.log('✓ Warehouse:', sessionInfo.WAREHOUSE);
  console.log('✓ Database:', sessionInfo.DATABASE);
  console.log('✓ Schema:', sessionInfo.SCHEMA);

  // 3. 실제 쿼리 실행
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sqlText,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          // Query ID 로깅
          console.log('Query ID:', stmt.getQueryId());
          
          // getSessionState() 시도 (참고용)
          const sessionState = stmt.getSessionState();
          if (sessionState) {
            console.log('Session state from stmt:', sessionState);
          }
          
          resolve({ stmt, rows, sessionInfo });
        }
      }
    });
  });
}

// 사용
try {
  const result = await executeWithContextCheck(
    connection,
    'SELECT * FROM my_table LIMIT 10'
  );
  
  console.log('Query executed with context:');
  console.log('  Warehouse:', result.sessionInfo.WAREHOUSE);
  console.log('  Rows:', result.rows.length);
  console.log('  Query ID:', result.stmt.getQueryId());
  
} catch (error) {
  console.error('Query failed:', error.message);
}
```

---

## 디버깅 가이드

### 1. 전체 SessionState 객체 확인

```javascript
connection.execute({
  sqlText: 'SELECT 1',
  complete: function(err, stmt, rows) {
    const sessionState = stmt.getSessionState();
    
    console.log('=== Debug: SessionState ===');
    console.log('Type:', typeof sessionState);
    console.log('Value:', sessionState);
    console.log('JSON:', JSON.stringify(sessionState, null, 2));
    
    if (sessionState) {
      console.log('Keys:', Object.keys(sessionState));
      for (const [key, value] of Object.entries(sessionState)) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
    } else {
      console.log('SessionState is undefined or null');
    }
  }
});
```

### 2. Context Functions로 비교

```javascript
async function debugSessionState(connection) {
  // getSessionState() 방식
  const stmtResult = await new Promise((resolve) => {
    connection.execute({
      sqlText: 'SELECT 1',
      complete: function(err, stmt, rows) {
        resolve({
          sessionState: stmt.getSessionState(),
          queryId: stmt.getQueryId()
        });
      }
    });
  });

  console.log('\n=== Method 1: getSessionState() ===');
  console.log('Result:', stmtResult.sessionState);
  console.log('Query ID:', stmtResult.queryId);

  // Context Functions 방식
  const contextResult = await getSessionInfo(connection);
  
  console.log('\n=== Method 2: Context Functions ===');
  console.log('Warehouse:', contextResult.WAREHOUSE);
  console.log('Database:', contextResult.DATABASE);
  console.log('Schema:', contextResult.SCHEMA);
  console.log('Role:', contextResult.ROLE);

  // 비교
  console.log('\n=== Comparison ===');
  if (stmtResult.sessionState) {
    console.log('getSessionState() warehouse:', stmtResult.sessionState.warehouse);
    console.log('Context Function warehouse:', contextResult.WAREHOUSE);
    console.log('Match:', stmtResult.sessionState.warehouse === contextResult.WAREHOUSE);
  } else {
    console.log('⚠️  getSessionState() returned undefined/null');
    console.log('✓  Context Functions returned:', contextResult.WAREHOUSE);
  }
}

// 사용
await debugSessionState(connection);
```

### 3. 연결 설정 확인

```javascript
async function debugConnectionSetup(connectionOptions) {
  console.log('=== Connection Options ===');
  console.log('Account:', connectionOptions.account);
  console.log('Username:', connectionOptions.username);
  console.log('Warehouse:', connectionOptions.warehouse || '⚠️  NOT SET');
  console.log('Database:', connectionOptions.database || '⚠️  NOT SET');
  console.log('Schema:', connectionOptions.schema || '⚠️  NOT SET');
  console.log('Role:', connectionOptions.role || '⚠️  NOT SET');

  const connection = snowflake.createConnection(connectionOptions);
  
  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        console.error('\n❌ Connection failed:', err.message);
        reject(err);
      } else {
        console.log('\n✓ Connection successful, ID:', conn.getId());
        resolve(conn);
      }
    });
  });

  try {
    // 실제 세션 정보 확인
    const sessionInfo = await getSessionInfo(connection);
    
    console.log('\n=== Actual Session Context ===');
    console.log('Warehouse:', sessionInfo.WAREHOUSE || '⚠️  NULL');
    console.log('Database:', sessionInfo.DATABASE || '⚠️  NULL');
    console.log('Schema:', sessionInfo.SCHEMA || '⚠️  NULL');
    console.log('Role:', sessionInfo.ROLE || '⚠️  NULL');

    // 불일치 확인
    const mismatches = [];
    if (connectionOptions.warehouse && sessionInfo.WAREHOUSE !== connectionOptions.warehouse) {
      mismatches.push(`Warehouse: expected ${connectionOptions.warehouse}, got ${sessionInfo.WAREHOUSE}`);
    }
    if (connectionOptions.database && sessionInfo.DATABASE !== connectionOptions.database) {
      mismatches.push(`Database: expected ${connectionOptions.database}, got ${sessionInfo.DATABASE}`);
    }
    if (connectionOptions.schema && sessionInfo.SCHEMA !== connectionOptions.schema) {
      mismatches.push(`Schema: expected ${connectionOptions.schema}, got ${sessionInfo.SCHEMA}`);
    }
    if (connectionOptions.role && sessionInfo.ROLE !== connectionOptions.role) {
      mismatches.push(`Role: expected ${connectionOptions.role}, got ${sessionInfo.ROLE}`);
    }

    if (mismatches.length > 0) {
      console.log('\n⚠️  Context Mismatches Detected:');
      mismatches.forEach(m => console.log('  -', m));
      console.log('\n💡 Possible causes:');
      console.log('  1. Specified object does not exist');
      console.log('  2. User lacks permission to use the object');
      console.log('  3. Role needs USAGE grant on warehouse/database');
    } else {
      console.log('\n✓ All contexts match connection options');
    }

  } catch (error) {
    console.error('\n❌ Failed to get session info:', error.message);
  } finally {
    connection.destroy();
  }
}

// 사용
await debugConnectionSetup({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  warehouse: 'COMPUTE_WH',
  database: 'MY_DB',
  schema: 'PUBLIC',
  role: 'ANALYST'
});
```

### 4. 권한 확인

```javascript
async function checkPermissions(connection) {
  console.log('=== Checking Permissions ===');

  // 현재 Role 확인
  const sessionInfo = await getSessionInfo(connection);
  console.log('Current Role:', sessionInfo.ROLE);

  // Warehouse 사용 권한 확인
  try {
    const result = await executeQuery(
      connection,
      `SHOW GRANTS TO ROLE ${sessionInfo.ROLE}`
    );
    
    console.log('\nGrants for role', sessionInfo.ROLE + ':');
    result.rows.forEach(row => {
      if (row.privilege === 'USAGE' && row.granted_on === 'WAREHOUSE') {
        console.log('  ✓ USAGE on WAREHOUSE', row.name);
      }
      if (row.privilege === 'USAGE' && row.granted_on === 'DATABASE') {
        console.log('  ✓ USAGE on DATABASE', row.name);
      }
    });
  } catch (error) {
    console.error('Failed to check permissions:', error.message);
  }
}

// 사용
await checkPermissions(connection);
```

---

## 베스트 프랙티스

### 1. 연결 시 항상 컨텍스트 명시

```javascript
// ✅ 좋은 예
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  warehouse: 'COMPUTE_WH',    // 명시
  database: 'MY_DB',          // 명시
  schema: 'PUBLIC',           // 명시
  role: 'ANALYST',            // 명시
  clientSessionKeepAlive: true
});

// ❌ 나쁜 예
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password'
  // warehouse, database, schema 없음!
});
```

### 2. Context Functions를 사용한 Helper 함수

```javascript
class SnowflakeHelper {
  constructor(connection) {
    this.connection = connection;
  }

  async getSessionInfo() {
    const result = await this.execute(`
      SELECT 
        CURRENT_WAREHOUSE() as warehouse,
        CURRENT_DATABASE() as database,
        CURRENT_SCHEMA() as schema,
        CURRENT_ROLE() as role,
        CURRENT_USER() as user
    `);
    return result.rows[0];
  }

  async ensureContext(requiredContext) {
    const current = await this.getSessionInfo();
    
    if (requiredContext.warehouse && !current.WAREHOUSE) {
      throw new Error('No active warehouse');
    }
    if (requiredContext.database && !current.DATABASE) {
      throw new Error('No active database');
    }
    if (requiredContext.schema && !current.SCHEMA) {
      throw new Error('No active schema');
    }
    
    return current;
  }

  async execute(sqlText, binds = []) {
    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sqlText,
        binds: binds,
        complete: function(err, stmt, rows) {
          if (err) {
            reject(err);
          } else {
            resolve({ stmt, rows });
          }
        }
      });
    });
  }

  async executeWithContext(sqlText, binds = []) {
    // 컨텍스트 확인
    const context = await this.ensureContext({
      warehouse: true,
      database: true
    });

    console.log(`Executing with context: ${context.WAREHOUSE}/${context.DATABASE}/${context.SCHEMA}`);

    return this.execute(sqlText, binds);
  }
}

// 사용
const helper = new SnowflakeHelper(connection);

try {
  const result = await helper.executeWithContext(
    'SELECT * FROM my_table WHERE id = ?',
    [123]
  );
  console.log('Results:', result.rows);
} catch (error) {
  console.error('Query failed:', error.message);
}
```

### 3. 환경별 설정 관리

```javascript
// config.js
module.exports = {
  development: {
    account: process.env.SF_DEV_ACCOUNT,
    username: process.env.SF_DEV_USER,
    password: process.env.SF_DEV_PASSWORD,
    warehouse: 'DEV_WH',
    database: 'DEV_DB',
    schema: 'PUBLIC',
    role: 'DEVELOPER'
  },
  production: {
    account: process.env.SF_PROD_ACCOUNT,
    username: process.env.SF_PROD_USER,
    password: process.env.SF_PROD_PASSWORD,
    warehouse: 'PROD_WH',
    database: 'PROD_DB',
    schema: 'PUBLIC',
    role: 'PROD_ROLE'
  }
};

// app.js
const config = require('./config');
const env = process.env.NODE_ENV || 'development';

const connection = snowflake.createConnection(config[env]);
```

### 4. 로깅 및 모니터링

```javascript
async function executeWithLogging(connection, sqlText, binds = []) {
  const startTime = Date.now();
  
  // 실행 전 컨텍스트 로깅
  const sessionInfo = await getSessionInfo(connection);
  
  console.log('\n=== Query Execution ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Context:', {
    warehouse: sessionInfo.WAREHOUSE,
    database: sessionInfo.DATABASE,
    schema: sessionInfo.SCHEMA,
    role: sessionInfo.ROLE
  });
  console.log('SQL:', sqlText);
  if (binds.length > 0) {
    console.log('Binds:', binds);
  }

  try {
    const result = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sqlText,
        binds: binds,
        complete: function(err, stmt, rows) {
          if (err) reject(err);
          else resolve({ stmt, rows });
        }
      });
    });

    const duration = Date.now() - startTime;

    console.log('Status: ✓ Success');
    console.log('Duration:', duration, 'ms');
    console.log('Query ID:', result.stmt.getQueryId());
    console.log('Rows:', result.rows.length);

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log('Status: ✗ Failed');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error.message);

    throw error;
  }
}
```

---

## 전체 예제 코드

### 완전한 Production-Ready 예제

```javascript
const snowflake = require('snowflake-sdk');

class SnowflakeConnection {
  constructor(options) {
    this.options = options;
    this.connection = null;
    this._sessionInfo = null;
  }

  async connect() {
    this.connection = snowflake.createConnection(this.options);

    await new Promise((resolve, reject) => {
      this.connection.connect((err, conn) => {
        if (err) {
          console.error('Connection failed:', err.message);
          reject(err);
        } else {
          console.log('✓ Connected to Snowflake, ID:', conn.getId());
          resolve(conn);
        }
      });
    });

    // 연결 후 세션 정보 캐싱
    await this.refreshSessionInfo();

    return this;
  }

  async refreshSessionInfo() {
    const result = await this.execute(`
      SELECT 
        CURRENT_WAREHOUSE() as warehouse,
        CURRENT_DATABASE() as database,
        CURRENT_SCHEMA() as schema,
        CURRENT_ROLE() as role,
        CURRENT_USER() as user,
        CURRENT_ACCOUNT() as account,
        CURRENT_SESSION() as session_id
    `);

    this._sessionInfo = result.rows[0];

    console.log('Session Info:', {
      warehouse: this._sessionInfo.WAREHOUSE,
      database: this._sessionInfo.DATABASE,
      schema: this._sessionInfo.SCHEMA,
      role: this._sessionInfo.ROLE
    });

    // 검증
    if (!this._sessionInfo.WAREHOUSE) {
      console.warn('⚠️  No active warehouse in session');
    }
    if (!this._sessionInfo.DATABASE) {
      console.warn('⚠️  No active database in session');
    }

    return this._sessionInfo;
  }

  getSessionInfo() {
    if (!this._sessionInfo) {
      throw new Error('Session info not available. Call connect() first.');
    }
    return this._sessionInfo;
  }

  async execute(sqlText, binds = []) {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sqlText,
        binds: binds,
        complete: function(err, stmt, rows) {
          if (err) {
            reject(err);
          } else {
            resolve({ stmt, rows });
          }
        }
      });
    });
  }

  async executeWithContext(sqlText, binds = []) {
    // 세션 정보 확인
    const session = this.getSessionInfo();

    if (!session.WAREHOUSE) {
      throw new Error('No active warehouse. Set warehouse in connection options or use USE WAREHOUSE command.');
    }

    console.log(`Executing query on ${session.WAREHOUSE}/${session.DATABASE}/${session.SCHEMA}`);

    const result = await this.execute(sqlText, binds);
    
    console.log('Query ID:', result.stmt.getQueryId());
    console.log('Rows returned:', result.rows.length);

    return result;
  }

  async useWarehouse(warehouseName) {
    await this.execute(`USE WAREHOUSE ${warehouseName}`);
    await this.refreshSessionInfo();
  }

  async useDatabase(databaseName) {
    await this.execute(`USE DATABASE ${databaseName}`);
    await this.refreshSessionInfo();
  }

  async useSchema(schemaName) {
    await this.execute(`USE SCHEMA ${schemaName}`);
    await this.refreshSessionInfo();
  }

  async destroy() {
    if (this.connection) {
      await new Promise((resolve) => {
        this.connection.destroy((err) => {
          if (err) {
            console.error('Error destroying connection:', err.message);
          }
          resolve();
        });
      });
      console.log('✓ Connection closed');
    }
  }
}

// 사용 예제
async function main() {
  const sf = new SnowflakeConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: 'COMPUTE_WH',
    database: 'MY_DB',
    schema: 'PUBLIC',
    role: 'ANALYST',
    clientSessionKeepAlive: true
  });

  try {
    // 연결
    await sf.connect();

    // 세션 정보 확인
    const sessionInfo = sf.getSessionInfo();
    console.log('\nCurrent Session:');
    console.log('  Warehouse:', sessionInfo.WAREHOUSE);
    console.log('  Database:', sessionInfo.DATABASE);
    console.log('  Schema:', sessionInfo.SCHEMA);
    console.log('  Role:', sessionInfo.ROLE);

    // 쿼리 실행
    const result1 = await sf.executeWithContext(
      'SELECT * FROM users WHERE active = ?',
      [true]
    );
    console.log('Query 1 results:', result1.rows.length, 'rows');

    // Warehouse 변경
    await sf.useWarehouse('LARGE_WH');
    console.log('\nSwitched to warehouse:', sf.getSessionInfo().WAREHOUSE);

    // 다른 쿼리 실행
    const result2 = await sf.executeWithContext(
      'SELECT COUNT(*) as total FROM large_table'
    );
    console.log('Query 2 results:', result2.rows[0]);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sf.destroy();
  }
}

// 프로그램 실행
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SnowflakeConnection;
```

---

## 핵심 요약

### ❌ 문제의 근본 원인

1. **`getSessionState()`는 신뢰할 수 없음**
   - 반환 타입이 `object | undefined`
   - 모든 쿼리에서 세션 상태를 반환하지 않음
   - Snowflake 서버 응답에 의존

2. **연결 옵션만으로는 부족**
   - 지정한 warehouse/database/schema가 실제로 설정된다는 보장 없음
   - 권한 문제로 인해 설정 실패 가능
   - 객체가 존재하지 않으면 설정 안됨

### ✅ 확실한 해결책

**Context Functions를 직접 쿼리하여 세션 정보 확인:**

```javascript
SELECT 
  CURRENT_WAREHOUSE() as warehouse,
  CURRENT_DATABASE() as database,
  CURRENT_SCHEMA() as schema,
  CURRENT_ROLE() as role
```

이 방법은:
- ✓ 항상 정확한 현재 세션 상태 반환
- ✓ null 체크로 미설정 상태 감지 가능
- ✓ Snowflake 공식 기능으로 신뢰성 보장

### 💡 모델이 이해해야 할 핵심

`getSessionState()`가 null을 반환하는 것은:
- **로깅 문제가 아님** - 실제로 세션 정보가 없거나 불완전함
- **디버깅 로그 추가로 해결 안됨** - 근본적으로 다른 접근 필요
- **Context Functions 사용이 정답** - 이것이 Snowflake가 제공하는 공식 방법

---

이 문서를 통해 LLM이 `getSessionState()`의 한계를 정확히 이해하고, Context Functions를 사용한 확실한 해결 방법을 제안할 수 있습니다.
