# Phase 1: Foundation - Research

**Researched:** 2026-01-28
**Domain:** Authentication, Session Management, API Key Storage, Remix
**Confidence:** HIGH

## Summary

This research covers authentication implementation for a Remix application using remix-auth with the FormStrategy for email/password authentication, Drizzle ORM with PostgreSQL for data persistence, and server-side encrypted storage for Anthropic API keys.

The authentication landscape has shifted significantly since Lucia Auth was deprecated in March 2025. The recommended approach is now remix-auth combined with @oslojs packages for cryptographic operations. For password hashing, Argon2id is the current standard (via the `argon2` npm package). API keys must be encrypted at rest using AES-256-GCM with unique IVs per encryption.

The shadcn/ui library provides pre-built login form blocks that can be customized, eliminating the need to hand-roll authentication UI. Drizzle ORM's identity columns are the modern standard for PostgreSQL primary keys (replacing serial types).

**Primary recommendation:** Use remix-auth + remix-auth-form for authentication, argon2 for password hashing, Node.js crypto with AES-256-GCM for API key encryption, and database session storage for session management.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library           | Version | Purpose                  | Why Standard                                         |
| ----------------- | ------- | ------------------------ | ---------------------------------------------------- |
| remix-auth        | 4.x     | Authentication framework | Strategy pattern, Remix-native, Passport.js-inspired |
| remix-auth-form   | 3.0.0   | Form-based auth strategy | Official strategy for email/password                 |
| argon2            | 0.40+   | Password hashing         | PHC winner, memory-hard, recommended over bcrypt     |
| drizzle-orm       | latest  | Database ORM             | Type-safe, schema-as-code, identity column support   |
| @anthropic-ai/sdk | latest  | Anthropic API client     | Official SDK with TypeScript support                 |

### Supporting

| Library          | Version | Purpose             | When to Use                                 |
| ---------------- | ------- | ------------------- | ------------------------------------------- |
| @oslojs/encoding | latest  | Base64/hex encoding | Encoding IVs and encrypted data for storage |
| @oslojs/crypto   | latest  | HMAC, secure random | Session token generation                    |
| drizzle-kit      | latest  | Migrations CLI      | Schema changes and database sync            |
| drizzle-zod      | latest  | Schema validation   | Runtime validation with Zod integration     |
| zod              | latest  | Validation library  | Form validation, type inference             |

### Alternatives Considered

| Instead of      | Could Use         | Tradeoff                                                 |
| --------------- | ----------------- | -------------------------------------------------------- |
| argon2          | @node-rs/argon2   | Rust-based, faster, no node-gyp, but less mature         |
| argon2          | bcrypt            | Battle-tested but 72-byte limit, less secure than Argon2 |
| remix-auth      | Better Auth       | Full-featured but adds more complexity/magic             |
| Cookie sessions | Database sessions | Cookie sessions simpler but 4KB limit                    |

**Installation:**

```bash
npm install remix-auth remix-auth-form argon2 drizzle-orm drizzle-zod zod @anthropic-ai/sdk @oslojs/encoding @oslojs/crypto
npm install -D drizzle-kit
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── db/
│   ├── schema/
│   │   ├── users.ts          # User table definition
│   │   ├── sessions.ts       # Session table definition
│   │   └── api-keys.ts       # Encrypted API key storage
│   ├── index.ts              # Drizzle client export
│   └── migrations/           # Generated migrations
├── services/
│   ├── auth.server.ts        # Authenticator setup
│   ├── session.server.ts     # Session storage config
│   ├── password.server.ts    # Argon2 hash/verify
│   └── encryption.server.ts  # AES-256-GCM for API keys
├── routes/
│   ├── login.tsx             # Login form and action
│   ├── register.tsx          # Registration form and action
│   ├── logout.tsx            # Logout action
│   └── settings.tsx          # API key management
└── components/
    └── login-form.tsx        # shadcn/ui login component
```

### Pattern 1: Database Session Storage

**What:** Store session ID in cookie, session data in PostgreSQL
**When to use:** Always for production (avoid 4KB cookie limit)
**Example:**

```typescript
// Source: Remix docs - createSessionStorage
// app/services/session.server.ts
import { createSessionStorage } from '@remix-run/node'
import { db } from '~/db'
import { sessions } from '~/db/schema/sessions'
import { eq } from 'drizzle-orm'

export const sessionStorage = createSessionStorage({
    cookie: {
        name: '__session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets: [process.env.SESSION_SECRET!],
        secure: process.env.NODE_ENV === 'production',
    },
    async createData(data, expires) {
        const [session] = await db
            .insert(sessions)
            .values({
                data: JSON.stringify(data),
                expiresAt: expires,
            })
            .returning({ id: sessions.id })
        return session.id
    },
    async readData(id) {
        const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, id),
        })
        if (!session) return null
        return JSON.parse(session.data)
    },
    async updateData(id, data, expires) {
        await db
            .update(sessions)
            .set({ data: JSON.stringify(data), expiresAt: expires })
            .where(eq(sessions.id, id))
    },
    async deleteData(id) {
        await db.delete(sessions).where(eq(sessions.id, id))
    },
})

export const { getSession, commitSession, destroySession } = sessionStorage
```

### Pattern 2: Authenticator with FormStrategy

**What:** remix-auth Authenticator configured for email/password
**When to use:** All email/password authentication flows
**Example:**

```typescript
// Source: remix-auth-form GitHub README
// app/services/auth.server.ts
import { Authenticator } from 'remix-auth'
import { FormStrategy } from 'remix-auth-form'
import { sessionStorage } from './session.server'
import { verifyPassword } from './password.server'
import { db } from '~/db'
import { users } from '~/db/schema/users'
import { eq } from 'drizzle-orm'

export type AuthUser = {
    id: string
    email: string
}

export const authenticator = new Authenticator<AuthUser>()

authenticator.use(
    new FormStrategy(async ({ form }) => {
        const email = form.get('email') as string
        const password = form.get('password') as string

        if (!email || !password) {
            throw new Error('Email and password are required')
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        })

        if (!user) {
            throw new Error('Invalid credentials')
        }

        const isValid = await verifyPassword(password, user.passwordHash)
        if (!isValid) {
            throw new Error('Invalid credentials')
        }

        return { id: user.id, email: user.email }
    }),
    'user-pass',
)
```

### Pattern 3: API Key Encryption at Rest

**What:** AES-256-GCM encryption with unique IV per key
**When to use:** Storing any sensitive API keys in database
**Example:**

```typescript
// Source: Node.js crypto docs, NIST 800-38D
// app/services/encryption.server.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits per NIST recommendation
const AUTH_TAG_LENGTH = 16

// Key must be 32 bytes (256 bits) - store in env var
const getKey = () => Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine IV + authTag + ciphertext for storage
    return Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'base64'),
    ]).toString('base64')
}

export function decrypt(encryptedData: string): string {
    const data = Buffer.from(encryptedData, 'base64')

    const iv = data.subarray(0, IV_LENGTH)
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(
        ciphertext.toString('base64'),
        'base64',
        'utf8',
    )
    decrypted += decipher.final('utf8')

    return decrypted
}
```

### Pattern 4: Route Protection

**What:** Require authentication in loaders/actions
**When to use:** Any protected route
**Example:**

```typescript
// Source: Remix auth patterns, Matt Stobbs blog
// app/routes/settings.tsx
import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { getSession } from '~/services/session.server'

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')

    if (!userId) {
        throw redirect('/login')
    }

    // Fetch user data
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    })

    return { user }
}
```

### Anti-Patterns to Avoid

- **Mutations in loaders:** Always perform auth mutations (login, logout, register) in `action` functions to prevent CSRF attacks
- **Returning sensitive data from loaders:** Any data returned is visible client-side
- **Cookie-only sessions for large data:** Use database sessions if session data exceeds 4KB
- **Hardcoded encryption keys:** Always use environment variables
- **Reusing IVs:** Generate a unique IV for every encryption operation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem             | Don't Build             | Use Instead                  | Why                                                            |
| ------------------- | ----------------------- | ---------------------------- | -------------------------------------------------------------- |
| Password hashing    | Custom hash function    | argon2 package               | Side-channel attacks, timing attacks, memory-hard requirements |
| Session management  | Custom session logic    | Remix createSessionStorage   | Cookie signing, expiration, CSRF protection built-in           |
| Form authentication | Custom auth flow        | remix-auth + FormStrategy    | Tested patterns, error handling, redirect management           |
| Login UI            | Custom form components  | shadcn/ui login blocks       | Accessible, styled, tested components                          |
| API key encryption  | Simple encryption       | AES-256-GCM with proper IV   | Authentication tag prevents tampering                          |
| CSRF protection     | Manual token management | Remix SameSite=Lax + actions | Framework handles this correctly                               |

**Key insight:** Authentication and cryptography have countless edge cases that only become apparent under attack. Using battle-tested libraries eliminates entire classes of vulnerabilities.

## Common Pitfalls

### Pitfall 1: CSRF via Loader Mutations

**What goes wrong:** Logout or other mutations performed in loaders instead of actions
**Why it happens:** Loaders seem convenient for simple operations
**How to avoid:** ALL mutations must be in action functions
**Warning signs:** GET requests triggering state changes

### Pitfall 2: Password Length Truncation (bcrypt)

**What goes wrong:** bcrypt truncates passwords at 72 bytes, weakening long passwords
**Why it happens:** Using bcrypt instead of Argon2
**How to avoid:** Use Argon2id which has no length limit
**Warning signs:** Using bcrypt v5.0.0 (has additional wrap-around bug at 255 chars)

### Pitfall 3: Exposing Sensitive Data in Loaders

**What goes wrong:** Loader returns user data including password hash or API key
**Why it happens:** Convenience of returning full user object
**How to avoid:** Explicitly select only needed fields, never return encrypted data to client
**Warning signs:** Full user objects in loader returns

### Pitfall 4: IV Reuse in Encryption

**What goes wrong:** Reusing initialization vectors compromises encryption security
**Why it happens:** Misunderstanding that IV must be unique per encryption
**How to avoid:** Always generate random IV with `crypto.randomBytes(12)` for each encryption
**Warning signs:** Static IV constant, IV stored separately from ciphertext

### Pitfall 5: Cookie Secret Rotation Breaking Sessions

**What goes wrong:** Rotating cookie secrets invalidates all existing sessions
**Why it happens:** Only setting one secret
**How to avoid:** Add new secret at index 0, keep old secrets in array for validation
**Warning signs:** All users logged out after deployment

### Pitfall 6: Environment Variable Exposure

**What goes wrong:** Secrets returned from loaders or included in client bundles
**Why it happens:** Module side effects, improper loader returns
**How to avoid:** Keep secrets in `.server.ts` files, never return env vars from loaders
**Warning signs:** Secrets visible in browser devtools

## Code Examples

Verified patterns from official sources:

### User and Session Schema (Drizzle)

```typescript
// Source: Drizzle docs + modern PostgreSQL best practices
// app/db/schema/users.ts
import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
})

// app/db/schema/sessions.ts
export const sessions = pgTable('sessions', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    data: text('data').notNull(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// app/db/schema/api-keys.ts
export const apiKeys = pgTable('api_keys', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    encryptedKey: text('encrypted_key').notNull(), // AES-256-GCM encrypted
    provider: text('provider').notNull().default('anthropic'),
    modelPreference: text('model_preference').default(
        'claude-sonnet-4-5-20250929',
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
})
```

### Password Hashing with Argon2

```typescript
// Source: argon2 npm package documentation
// app/services/password.server.ts
import argon2 from 'argon2'

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
        type: argon2.argon2id, // Hybrid mode - recommended
        memoryCost: 65536, // 64 MB
        timeCost: 3, // 3 iterations
        parallelism: 4, // 4 threads
    })
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    try {
        return await argon2.verify(hash, password)
    } catch {
        return false
    }
}
```

### Login Route Action

```typescript
// Source: remix-auth docs, Remix session patterns
// app/routes/login.tsx
import { type ActionFunctionArgs, redirect } from '@remix-run/node'
import { authenticator } from '~/services/auth.server'
import { getSession, commitSession } from '~/services/session.server'

export async function action({ request }: ActionFunctionArgs) {
    try {
        const user = await authenticator.authenticate('user-pass', request)

        const session = await getSession(request.headers.get('Cookie'))
        session.set('userId', user.id)

        return redirect('/dashboard', {
            headers: {
                'Set-Cookie': await commitSession(session, {
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                }),
            },
        })
    } catch (error) {
        const session = await getSession(request.headers.get('Cookie'))
        session.flash('error', 'Invalid email or password')

        return redirect('/login', {
            headers: {
                'Set-Cookie': await commitSession(session),
            },
        })
    }
}
```

### Anthropic Client with User API Key

```typescript
// Source: Anthropic SDK docs
// app/services/anthropic.server.ts
import Anthropic from '@anthropic-ai/sdk'
import { decrypt } from './encryption.server'

export function createAnthropicClient(encryptedApiKey: string): Anthropic {
    const apiKey = decrypt(encryptedApiKey)
    return new Anthropic({ apiKey })
}

export async function listModels(): Promise<string[]> {
    // Available Claude models as of 2026
    return [
        'claude-sonnet-4-5-20250929',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
    ]
}
```

## State of the Art

| Old Approach    | Current Approach     | When Changed                  | Impact                                |
| --------------- | -------------------- | ----------------------------- | ------------------------------------- |
| Lucia Auth      | remix-auth + @oslojs | March 2025                    | Must roll custom session handling     |
| bcrypt          | Argon2id             | 2015+ (PHC)                   | Better security, no length limits     |
| serial columns  | Identity columns     | PostgreSQL 10+ / Drizzle 2024 | Modern standard for auto-increment    |
| Cookie sessions | Database sessions    | Always for prod               | Eliminates 4KB limit                  |
| AES-CBC         | AES-GCM              | NIST recommendation           | Authentication tag prevents tampering |

**Deprecated/outdated:**

- **Lucia Auth package:** Deprecated March 2025, use remix-auth + custom session handling
- **bcrypt v5.0.0:** Has wrap-around bug at 255 chars, use v5.0.1+ or prefer Argon2
- **serial/bigserial:** Use identity columns (`generatedAlwaysAsIdentity()`) instead

## Open Questions

Things that couldn't be fully resolved:

1. **@oslojs/crypto password hashing**
    - What we know: @oslojs/crypto provides SHA, HMAC, ECDSA, RSA - no explicit password hashing
    - What's unclear: Whether there's a separate @oslojs package for password hashing
    - Recommendation: Use dedicated `argon2` npm package which is well-established

2. **Remix v2 vs React Router v7 session APIs**
    - What we know: remix-auth supports both Remix and React Router
    - What's unclear: Exact import paths may differ between frameworks
    - Recommendation: Follow remix-auth README for current import patterns

3. **Model list API from Anthropic**
    - What we know: SDK allows specifying model in requests
    - What's unclear: Whether there's a list-models endpoint
    - Recommendation: Hardcode available models, update periodically

## Sources

### Primary (HIGH confidence)

- [remix-auth GitHub](https://github.com/sergiodxa/remix-auth) - Authentication framework setup
- [remix-auth-form GitHub](https://github.com/sergiodxa/remix-auth-form) - FormStrategy v3.0.0
- [Remix Sessions Documentation](https://v2.remix.run/docs/utils/sessions/) - Session storage patterns
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/get-started/postgresql-new) - PostgreSQL setup
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) - API client usage
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html) - AES-256-GCM encryption
- [shadcn/ui Login Blocks](https://ui.shadcn.com/blocks/login) - Pre-built components

### Secondary (MEDIUM confidence)

- [Arcjet Remix Security Checklist](https://blog.arcjet.com/remix-security-checklist/) - Security best practices
- [Matt Stobbs - Remix Authentication](https://www.mattstobbs.com/remix-authentication/) - Complete auth patterns
- [Drizzle PostgreSQL Best Practices Gist](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Schema patterns 2025
- [argon2 npm package](https://www.npmjs.com/package/argon2) - Password hashing
- [AES-256-GCM Gist](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) - Encryption patterns

### Tertiary (LOW confidence)

- [Lucia Auth Deprecation Discussion](https://github.com/lucia-auth/lucia/discussions/1714) - Migration guidance
- [Oslo.js Documentation](https://oslojs.dev/) - Limited detail on specific packages

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Verified with official docs and GitHub repos
- Architecture: HIGH - Patterns from Remix official docs and established community guides
- Pitfalls: HIGH - Documented in official security guides and framework docs
- Encryption: HIGH - Based on Node.js crypto docs and NIST standards

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain)
