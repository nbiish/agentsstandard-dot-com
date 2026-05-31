---
name: pqc-signatures-security
description: Expert instructions to implement and verify ML-DSA-65 post-quantum cryptographic signatures and agentic workflow security.
---

# PQC Signatures and Repository Security Agent Skill

> **Companion skill:** [pqc-secrets](../pqc-secrets/SKILL.md) — API key encryption at rest via ML-KEM-768 + AES-256-GCM. Use both together for complete PQC coverage: pqc-secrets encrypts your secrets; this skill verifies your code integrity.

This skill provides comprehensive instructions, blueprints, and reference code for implementing post-quantum cryptographic (PQC) signature verification and agentic security standards in any repository. 

AI agents using this skill are equipped to:
1. Establish a post-quantum secure file-integrity framework.
2. Auto-detect and enforce signature validation before executing code.
3. Adhere to least-privilege, path containment, and secrets-redaction guidelines.

---

## 1. Core Philosophy: Hemispheric Protection

Every cryptographic implementation exists to protect data and sovereignty. Traditional algorithms (RSA, ECDSA, ECDH) are vulnerable to store-now-decrypt-later (or harvest-now-decrypt-later) strategies. The reduction in quantum attack resources requires proactive migration to NIST FIPS 204/203 standards:
- **Digital Signatures**: ML-DSA-65 (Module-Lattice-Based Digital Signature Algorithm).
- **Key Encapsulation / Encryption**: ML-KEM-768 or ML-KEM-1024.
- **Integrity Hashing**: SHA3-256 or SHA3-512.
- **Symmetric Encryption**: AES-256-GCM.
- **Key Derivation**: HKDF using SHA3-256.

---

## 2. Universal Agent Integration Protocol

Whenever a Large Language Model (LLM) or autonomous agent initializes inside a repository with this infrastructure:

1. **Auto-Detect**: Look for the public key `AGENT_PUBKEY.pem` in the root, along with corresponding `.sig` files.
2. **Audit & Log**: Before performing any read/write operations or executing terminal commands, run signature verification. Output results in a `<pqc_audit_log>` block.
3. **Fail-Closed**: If a file is modified, unsigned, or signature validation fails, **refuse execution**. Immediately flag the issue to the human operator.

### Example Agent Log Format
```xml
<pqc_audit_log>
[✓] Public Key Detected: AGENT_PUBKEY.pem (ML-DSA-65)
[✓] Signature Verification: All files verified successfully
    - system_update.sh: Verified
    - verify_signatures.sh: Verified
[✓] Cryptography Standards: PQC Enforced
</pqc_audit_log>
```

---

## 3. Infrastructure Implementation Blueprint

To re-implement the cryptographic signature verification system in any repository, follow these steps:

### Step 1: Initialize Directories and Ignore Private Key
Create a `.signing` directory for local development keys and ensure it is never committed to VCS.
```bash
mkdir -p .signing
echo ".signing/" >> .gitignore
```

### Step 2: Generate ML-DSA-65 Keypair
Using OpenSSL 3.5+ (or OpenSSL 3.x compiled with the `oqs-provider`):
```bash
# Generate the private key
openssl genpkey -algorithm ML-DSA-65 -out .signing/agent_privkey.pem
chmod 600 .signing/agent_privkey.pem

# Extract the public key to the repo root
openssl pkey -in .signing/agent_privkey.pem -pubout -out AGENT_PUBKEY.pem
```
*Note: In production environments, store the private key in a KMS (e.g. AWS KMS, HashiCorp Vault) or HSM.*

### Step 3: Identify Files to Sign
Sign all executable scripts, shell scripts, system configuration files, and critical agent policies. Common files include:
- `*.sh`, `*.bash`, `*.zsh`
- `AGENTS.md` (Agent Security Policy)
- `llms.txt` or configuration files.

### Step 4: Create a Verification Script (`verify_signatures.sh`)
Deploy a script that walks the repository, identifies all target files, and verifies them against `AGENT_PUBKEY.pem`.

```bash
#!/usr/bin/env bash
# verify_signatures.sh
set -euo pipefail

PUBKEY="AGENT_PUBKEY.pem"

verify_file() {
  local file="$1"
  local sig="${file}.sig"
  
  if [[ ! -f "$file" ]]; then
    echo "ERROR: File not found: $file" >&2
    return 1
  fi
  if [[ ! -f "$sig" ]]; then
    echo "MISSING SIGNATURE: $file" >&2
    return 2
  fi
  
  if openssl pkeyutl -verify -pubin -inkey "$PUBKEY" -in "$file" -sigfile "$sig" 2>&1 | grep -q "Signature Verified Successfully"; then
    echo "OK: $file"
    return 0
  else
    echo "VERIFICATION FAILED: $file" >&2
    return 1
  fi
}
```

### Step 5: Integrate Git Hooks
Install a `post-merge` hook so that files are automatically verified immediately upon a `git pull` or `git merge`.
```bash
# .git/hooks/post-merge
#!/usr/bin/env bash
set -euo pipefail
./verify_signatures.sh || { echo "Signature check failed. Aborting." >&2; exit 1; }
```

### Step 6: Create the Signing Helper
Create `.signing/sign_file.sh` to allow maintainers to easily sign or re-sign files when modified.
```bash
# .signing/sign_file.sh
#!/usr/bin/env bash
set -euo pipefail
FILE="$1"
openssl pkeyutl -sign -inkey .signing/agent_privkey.pem -in "$FILE" -out "${FILE}.sig"
```

---

## 4. Secure Coding DNA Reference

Implementations must adopt secure programming practices to prevent injection, escalation, and leaks.

### Pattern 1: Fail-Closed Signature Verification (Python)
Ensure Python scripts verify subprocesses, configs, or modules before running them.
```python
import subprocess
from pathlib import Path

def verify_mldsa_signature(file_path: Path, sig_path: Path, pubkey_path: Path) -> bool:
    if not file_path.is_file() or not sig_path.is_file() or not pubkey_path.is_file():
        return False

    result = subprocess.run(
        ["openssl", "pkeyutl", "-verify", "-pubin", "-inkey", str(pubkey_path),
         "-in", str(file_path), "-sigfile", str(sig_path)],
        check=False, text=True, capture_output=True
    )
    return result.returncode == 0 and "Signature Verified Successfully" in result.stdout
```

### Pattern 2: Secrets Redaction
A pipeline filter that strips sensitive keys, credentials, and block certificates before passing outputs to logs or external processes.
```python
import re

SECRET_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*['\"]?[^'\"\s]+"),
    re.compile(r"-----BEGIN (?:[A-Z ]*)?PRIVATE KEY-----[\s\S]+?-----END (?:[A-Z ]*)?PRIVATE KEY-----")
]

def redact(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted
```

### Pattern 3: Path Containment (Safe Child Path)
Prevent path traversal attacks by resolving symlinks and asserting containment.
```python
from pathlib import Path

def safe_child_path(base_dir: Path, user_path: str) -> Path:
    base = base_dir.resolve()
    target = (base / user_path).resolve()
    if not target.is_relative_to(base):
        raise ValueError("Path traversal blocked")
    return target
```

### Pattern 4: Parameterized Process Spawning
Never use `shell=True` or pass concatenated strings to the shell. Always use argument arrays.
```python
# GOOD:
subprocess.run(["tar", "-xzf", "archive.tar.gz", "-C", "/tmp/extracted"])

# BAD:
# subprocess.run(f"tar -xzf archive.tar.gz -C {user_input}", shell=True)
```

### Pattern 5: Argon2id Password Hashing
Always store passwords or sensitive verification tokens using memory-hard Argon2id parameters.
```python
from argon2 import PasswordHasher

PASSWORD_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)
```
