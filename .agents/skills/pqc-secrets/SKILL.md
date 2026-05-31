---
name: pqc-secrets
description: Post-quantum cryptography secrets management system for protecting API keys, tokens, and private data.
---

# PQC Secrets Management Agent Skill

> **Companion skill:** [pqc-signatures-security](../pqc-signatures-security/SKILL.md) — ML-DSA-65 code signing, integrity verification, and secure coding patterns. Use both together for complete PQC coverage: this skill encrypts secrets at rest; pqc-signatures-security verifies code hasn't been tampered with.

This skill provides comprehensive instructions, policies, and blueprints for managing repository and application secrets (API keys, credentials, private user data) using post-quantum cryptographic (PQC) algorithms.

AI agents using this skill are equipped to:
1. Protect credentials at rest and in memory using FIPS-compliant algorithms.
2. Integrate with the platform's native keychain and standard runtime environments.
3. Validate environments and ensure zero plaintext credentials are written to disk.

---

## 1. Core Philosophy: Zero Plaintext on Disk

Traditional secrets management relies heavily on plaintext `.env` files or insecure environment variables. Under the PQC mandate:
- **Always** protect API keys and private data with FIPS 203 (ML-KEM-768) key encapsulation and AES-256-GCM symmetric encryption.
- **Never** store raw API keys, secrets, or tokens in git repositories, task files, logs, or local unencrypted files.
- **Always** load secrets on-demand directly into the shell environment from an encrypted bundle, and ensure they never persist to disk.

---

## 2. Infrastructure Architecture

The local secrets infrastructure lives at `~/.config/pqc-secrets/`:

```
macOS Keychain                    ~/.config/pqc-secrets/
┌──────────────────────┐          ┌────────────────────────────┐
│ service: pqc-secrets │          │ recipient.pub              │
│ ML-KEM-768 secret key│          │ ML-KEM-768 public key      │
│ (Secure Enclave)     │          │ (safe to commit)           │
└──────────┬───────────┘          └────────────┬───────────────┘
           │                                   │
           │ decaps (ML-KEM-768)               │ encaps
           ▼                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    secrets.bundle.json                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐   │
│  │ kem.ciphertext  │  │ data.ciphertext (AES-256-GCM)    │   │
│  │ (ML-KEM-768)    │  │ 24+ API keys encrypted at rest   │   │
│  └─────────────────┘  └──────────────┬───────────────────┘   │
└──────────────────────────────────────┼───────────────────────┘
                                       │ decrypt
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Exported environment variables (never touch disk)           │
│  ANTHROPIC_AUTH_TOKEN  ZENMUX_API_KEY  NEBIUS_API_KEY        │
│  OPENROUTER_API_KEY    WAFER_API_KEY    ... (in-memory only) │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Cryptographic Standards

For all secrets operations, only NIST-approved post-quantum algorithms are permitted. Traditional classical algorithms are strictly forbidden for protecting key material:

| Use Case | Permitted Algorithms (FIPS) | Forbidden Algorithms |
|---|---|---|
| Key Encapsulation (KEM) | ML-KEM-768, ML-KEM-1024 | RSA, ECDH, ECDSA, Ed25519 |
| Symmetric Encryption | AES-256-GCM | AES-CBC, DES, 3DES, Blowfish, RC4 |
| Digital Signatures | ML-DSA-65/87, SLH-DSA-SHA2-128s | MD5, SHA-1, RSA, DSA |

---

## 4. Lifecycle Commands

Always use the compiled native Rust release binary `bin/pqc-secrets` for secrets operations:

| Step | Command | Description |
|---|---|---|
| **Keygen** | `bin/pqc-secrets keygen` | Generates a new ML-KEM-768 keypair. Stores the private key in macOS Keychain (service: `pqc-secrets`, account: `default`) and writes public key to `~/.config/pqc-secrets/recipient.pub`. |
| **Pack** | `bin/pqc-secrets pack` | Reads `KEY=VAL` lines from stdin, encrypts them via AES-256-GCM, wraps the data key via ML-KEM-768 encapsulation, and outputs `~/.config/pqc-secrets/secrets.bundle.json`. |
| **Load** | `secrets-load` (or `bin/pqc-secrets export`) | Decrypts the bundle in-memory and outputs `export KEY=VALUE` lines. The `secrets-load` zsh function evaluates this output. |
| **Rotate** | `bin/pqc-secrets keygen && bin/pqc-secrets pack` | Generates a new keypair and packs the secrets under the new public key. |

---

## 5. Application Integration Guidelines

Applications must read secrets exclusively from environment variables populated dynamically in memory. Do not store or read plaintext files inside the application context.

### Pattern 1: Safe Environment Variable Consumption (Python)
```python
import os
import sys

def get_api_key(name: str) -> str:
    """Retrieve secret from environment, ensuring no fallback to disk files."""
    api_key = os.environ.get(name)
    if not api_key:
        print(f"CRITICAL ERROR: Environment variable '{name}' is not set.", file=sys.stderr)
        print("Please load secrets via 'secrets-load' before running this command.", file=sys.stderr)
        sys.exit(1)
    return api_key
```

### Pattern 2: Safe Environment Variable Consumption (Node.js)
```javascript
function getApiKey(name) {
    const apiKey = process.env[name];
    if (!apiKey) {
        console.error(`CRITICAL ERROR: Environment variable '${name}' is not set.`);
        console.error("Please load secrets via 'secrets-load' before running this application.");
        process.exit(1);
    }
    return apiKey;
}
```

### Pattern 3: Shell Wrapper Integration
When wrapping command-line tools or other agents, pass env variables down rather than writing to disk config files. If a configuration file is strictly required by the tool (e.g. `auth.json` or `.env` file), write it dynamically to a secure directory (or temporary RAM disk if supported) and delete it immediately upon tool exit via traps.

```bash
# Example wrapper with exit trap for temporary configs
run_tool_with_secrets() {
  local temp_env
  temp_env=$(mktemp /tmp/tool-env.XXXXXX)
  trap 'rm -f "$temp_env"' EXIT
  
  # Populate temp config from environment variables loaded via secrets-load
  cat > "$temp_env" <<EOF
API_KEY="${ZENMUX_API_KEY}"
EOF

  command-tool --config "$temp_env" "$@"
}
```

### Pattern 4: Headless & CI/CD Pipelines
In headless environments where macOS Keychain is unavailable, use standard platform secrets injection (e.g., GitHub Secrets, Kubernetes Secrets, or Docker environment flags) passed dynamically from standard input.
```bash
# Injecting secrets directly via stdin to avoid write-to-disk
docker run -e ZENMUX_API_KEY=$(bin/pqc-secrets export | grep ZENMUX_API_KEY | cut -d= -f2) my-image
```
