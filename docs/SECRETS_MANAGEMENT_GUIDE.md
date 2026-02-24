# Secrets Management Guide

## 1. Current Risk Assessment (.env approach)

### Risks
| Risk | Severity | Description |
|------|----------|-------------|
| **Secret Leakage** | CRITICAL | .env files can be accidentally committed to git |
| **No Rotation** | HIGH | Secrets are static, no automated rotation |
| **Plain Text Storage** | HIGH | Secrets stored in plain text on disk |
| **No Audit Trail** | MEDIUM | No record of who accessed which secret |
| **Environment Drift** | MEDIUM | Different .env files across environments |
| **CI/CD Exposure** | HIGH | Secrets visible in CI logs if not masked |

### Current Secrets Inventory
```
# Database
DATABASE_URL=postgres://...

# Redis
REDIS_PASSWORD=dev-redis-password

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Keycloak
KEYCLOAK_CLIENT_SECRET=...
KEYCLOAK_ADMIN_PASSWORD=...

# Internal
INTERNAL_API_KEY=...
```

---

## 2. Recommended Solution: HashiCorp Vault

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│  Vault Agent    │────▶│  Vault Server   │
│   (Node.js)     │     │  (Sidecar)      │     │  (HA Cluster)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Storage Backend│
                                                │  (Consul/S3/etc)│
                                                └─────────────────┘
```

### Docker Compose for Development
```yaml
# docker/vault/docker-compose.yml
version: '3.8'

services:
  vault:
    image: hashicorp/vault:1.15
    container_name: erp-vault
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: "dev-root-token"
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    cap_add:
      - IPC_LOCK
    volumes:
      - vault_data:/vault/data
      - ./config:/vault/config
      - ./policies:/vault/policies
    command: server -dev
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  vault_data:
```

### Vault Policies
```hcl
# vault/policies/app-policy.hcl
# Policy for application secrets
path "secret/data/erp/*" {
  capabilities = ["read"]
}

path "secret/data/erp/jwt/*" {
  capabilities = ["read"]
}

# Deny write/delete access
path "secret/data/*" {
  capabilities = ["deny"]
}
```

```hcl
# vault/policies/admin-policy.hcl
# Policy for secret management
path "secret/data/erp/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/leases/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

### Node.js Integration
```typescript
// server/src/core/secrets/vault.provider.ts
import vault from 'node-vault';
import { logger } from '../utils/logger';

interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
}

class VaultSecretProvider {
  private client: vault.VaultClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private mountPath: string = 'secret';

  constructor(config: VaultConfig) {
    this.client = vault({
      endpoint: config.endpoint,
      token: config.token,
      namespace: config.namespace,
    });
  }

  async get(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const result = await this.client.read(`${this.mountPath}/data/erp/${key}`);
      const value = result.data.data.value;

      // Cache for 5 minutes
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return value;
    } catch (error) {
      logger.error(`[Vault] Failed to get secret: ${key}`, error);
      throw new Error(`Secret not found: ${key}`);
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.write(`${this.mountPath}/data/erp/${key}`, {
      data: { value },
    });
    this.cache.delete(key);
  }

  async rotate(key: string, newValue: string): Promise<void> {
    // Create new version
    await this.set(key, newValue);
    
    // Publish rotation event for other instances
    await this.publishRotation(key);
  }

  private async publishRotation(key: string): Promise<void> {
    // Use Redis pub/sub to notify other instances
    const { getRedis } = await import('../../config/redis');
    const redis = getRedis();
    await redis.publish('secret_rotation', JSON.stringify({
      key,
      timestamp: Date.now(),
    }));
  }
}

export const vaultProvider = new VaultSecretProvider({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN || '',
  namespace: process.env.VAULT_NAMESPACE,
});
```

---

## 3. AWS Secrets Manager Alternative

### Setup
```typescript
// server/src/core/secrets/aws-secrets.provider.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class AWSSecretsProvider {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'ap-south-1',
    });
  }

  async get(secretId: string): Promise<string> {
    const cached = this.cache.get(secretId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);

    const value = response.SecretString || '';
    
    this.cache.set(secretId, {
      value,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return value;
  }
}

export const awsSecretsProvider = new AWSSecretsProvider();
```

---

## 4. JWT Key Rotation Without Downtime

### Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    JWT Rotation Timeline                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  T+0        T+15min        T+30min        T+45min           │
│    │           │             │              │                │
│    ▼           ▼             ▼              ▼                │
│  ┌───┐      ┌───┐         ┌───┐          ┌───┐             │
│  │K1 │      │K1 │         │K1 │          │K2 │             │
│  │NEW│      │CUR│         │OLD│          │NEW│             │
│  └───┘      └───┘         └───┘          └───┘             │
│                                                              │
│  Phase 1:   Phase 2:       Phase 3:        Phase 4:         │
│  Add new    Sign with      Stop signing    Remove old       │
│  key K2     K2, verify     with K1         key K1           │
│             both K1,K2                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation
```typescript
// server/src/core/secrets/jwt-rotation.service.ts
import { getRedis } from '../../config/redis';
import { logger } from '../utils/logger';

interface JWTKey {
  kid: string;        // Key ID
  secret: string;     // The secret
  createdAt: Date;
  status: 'new' | 'current' | 'old' | 'deprecated';
}

class JWTRotationService {
  private keyPrefix = 'jwt:keys:';
  private rotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days

  async getCurrentKeys(): Promise<JWTKey[]> {
    const redis = getRedis();
    const keys: JWTKey[] = [];
    
    const keyIds = await redis.smembers(`${this.keyPrefix}active`);
    
    for (const kid of keyIds) {
      const keyData = await redis.get(`${this.keyPrefix}${kid}`);
      if (keyData) {
        keys.push(JSON.parse(keyData));
      }
    }
    
    return keys.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async rotateKey(): Promise<void> {
    const redis = getRedis();
    const keys = await this.getCurrentKeys();
    
    // Generate new key
    const newKid = `key_${Date.now()}`;
    const newSecret = this.generateSecret();
    
    const newKey: JWTKey = {
      kid: newKid,
      secret: newSecret,
      createdAt: new Date(),
      status: 'new',
    };
    
    // Store new key
    await redis.set(
      `${this.keyPrefix}${newKid}`,
      JSON.stringify(newKey),
      'EX',
      90 * 24 * 60 * 60 // 90 days TTL
    );
    
    await redis.sadd(`${this.keyPrefix}active`, newKid);
    
    // Update statuses
    for (const key of keys) {
      if (key.status === 'new') {
        key.status = 'current';
      } else if (key.status === 'current') {
        key.status = 'old';
      } else if (key.status === 'old') {
        key.status = 'deprecated';
        // Schedule removal after grace period
        await redis.srem(`${this.keyPrefix}active`, key.kid);
      }
      
      await redis.set(
        `${this.keyPrefix}${key.kid}`,
        JSON.stringify(key),
        'EX',
        90 * 24 * 60 * 60
      );
    }
    
    logger.info('[JWTRotation] Key rotation completed', {
      newKeyId: newKid,
      activeKeys: keys.length,
    });
    
    // Publish rotation event
    await redis.publish('jwt_rotation', JSON.stringify({
      newKid,
      timestamp: Date.now(),
    }));
  }

  private generateSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

export const jwtRotationService = new JWTRotationService();
```

---

## 5. .gitignore and CI/CD Guardrails

### .gitignore Additions
```gitignore
# Secrets - NEVER COMMIT
.env
.env.local
.env.*.local
*.pem
*.key
secrets.json
credentials.json

# Vault
vault-data/
vault-token

# AWS
.aws/credentials

# Kubernetes
*.kubeconfig
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for potential secrets
if git diff --cached --name-only | xargs grep -l "password\|secret\|api_key\|token" --include="*.env*" 2>/dev/null; then
    echo "❌ ERROR: Potential secrets detected in staged files!"
    echo "Please remove sensitive data before committing."
    exit 1
fi

# Check for .env files
if git diff --cached --name-only | grep -E "\.env$|\.env\."; then
    echo "❌ ERROR: .env files cannot be committed!"
    exit 1
fi

exit 0
```

### GitHub Actions Secret Scanning
```yaml
# .github/workflows/secret-scan.yml
name: Secret Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          extra_args: --only-verified
```

### Environment Variable Checklist

| Environment | Source | Rotation |
|-------------|--------|----------|
| Development | .env (gitignored) | Manual |
| Test | .env.test (gitignored) | Manual |
| Staging | Vault / AWS Secrets Manager | Monthly |
| Production | Vault / AWS Secrets Manager | Weekly |

---

## 6. Migration Path

### Phase 1: Immediate (Week 1)
- [ ] Add all .env files to .gitignore
- [ ] Install pre-commit hooks
- [ ] Add secret scanning to CI/CD

### Phase 2: Short-term (Week 2-4)
- [ ] Deploy Vault in development
- [ ] Migrate non-critical secrets to Vault
- [ ] Update application to read from Vault

### Phase 3: Medium-term (Month 2)
- [ ] Migrate all secrets to Vault
- [ ] Implement JWT key rotation
- [ ] Deploy Vault to staging/production

### Phase 4: Long-term (Month 3+)
- [ ] Implement automated secret rotation
- [ ] Add secret access auditing
- [ ] Disaster recovery testing