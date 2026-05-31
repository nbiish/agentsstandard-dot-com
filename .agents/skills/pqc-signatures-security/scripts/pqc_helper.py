#!/usr/bin/env python3
"""
pqc_helper.py - PQC Cryptographic helper for ML-DSA-65 signatures.
Provides utilities to generate keys, sign files, and verify signatures using OpenSSL.
"""

import sys
import subprocess
import argparse
from pathlib import Path

def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    """Run command securely and capture output."""
    try:
        return subprocess.run(
            args,
            check=True,
            text=True,
            capture_output=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {' '.join(args)}", file=sys.stderr)
        print(f"Stdout: {e.stdout}", file=sys.stderr)
        print(f"Stderr: {e.stderr}", file=sys.stderr)
        raise e

def generate_keypair(priv_path: Path, pub_path: Path) -> None:
    """Generate ML-DSA-65 keypair."""
    priv_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating ML-DSA-65 private key at: {priv_path}")
    run_command(["openssl", "genpkey", "-algorithm", "ML-DSA-65", "-out", str(priv_path)])
    priv_path.chmod(0o600)
    
    print(f"Generating public key at: {pub_path}")
    run_command(["openssl", "pkey", "-in", str(priv_path), "-pubout", "-out", str(pub_path)])
    print("Keypair generated successfully.")

def sign_file(file_path: Path, priv_path: Path, sig_path: Path) -> None:
    """Sign a file using ML-DSA-65 private key."""
    if not file_path.is_file():
        raise FileNotFoundError(f"File to sign not found: {file_path}")
    if not priv_path.is_file():
        raise FileNotFoundError(f"Private key not found: {priv_path}")
        
    print(f"Signing {file_path} -> {sig_path}")
    run_command([
        "openssl", "pkeyutl", "-sign",
        "-inkey", str(priv_path),
        "-in", str(file_path),
        "-out", str(sig_path)
    ])
    print("Signing complete.")

def verify_file(file_path: Path, pub_path: Path, sig_path: Path) -> bool:
    """Verify file signature against ML-DSA-65 public key."""
    if not file_path.is_file():
        print(f"ERROR: Target file not found: {file_path}", file=sys.stderr)
        return False
    if not pub_path.is_file():
        print(f"ERROR: Public key not found: {pub_path}", file=sys.stderr)
        return False
    if not sig_path.is_file():
        print(f"ERROR: Signature file not found: {sig_path}", file=sys.stderr)
        return False

    try:
        result = run_command([
            "openssl", "pkeyutl", "-verify",
            "-pubin", "-inkey", str(pub_path),
            "-in", str(file_path),
            "-sigfile", str(sig_path)
        ])
        if "Signature Verified Successfully" in result.stdout:
            print(f"✓ Verified: {file_path.name}")
            return True
        else:
            print(f"✗ Verification FAILED: {file_path.name}", file=sys.stderr)
            return False
    except Exception:
        print(f"✗ Verification FAILED (Command Error): {file_path.name}", file=sys.stderr)
        return False

def main() -> None:
    parser = argparse.ArgumentParser(description="PQC ML-DSA-65 Signature Helper Utility")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Keygen parser
    gen_parser = subparsers.add_parser("keygen", help="Generate ML-DSA-65 keypair")
    gen_parser.add_argument("--priv", type=Path, default=Path(".signing/agent_privkey.pem"), help="Path to private key")
    gen_parser.add_argument("--pub", type=Path, default=Path("AGENT_PUBKEY.pem"), help="Path to public key")

    # Sign parser
    sign_parser = subparsers.add_parser("sign", help="Sign a file")
    sign_parser.add_argument("file", type=Path, help="File to sign")
    sign_parser.add_argument("--priv", type=Path, default=Path(".signing/agent_privkey.pem"), help="Path to private key")
    sign_parser.add_argument("--sig", type=Path, help="Path to signature output (defaults to file.sig)")

    # Verify parser
    verify_parser = subparsers.add_parser("verify", help="Verify a file's signature")
    verify_parser.add_argument("file", type=Path, help="File to verify")
    verify_parser.add_argument("--pub", type=Path, default=Path("AGENT_PUBKEY.pem"), help="Path to public key")
    verify_parser.add_argument("--sig", type=Path, help="Path to signature file (defaults to file.sig)")

    args = parser.parse_args()

    if args.command == "keygen":
        generate_keypair(args.priv, args.pub)
    elif args.command == "sign":
        sig_file = args.sig or Path(f"{args.file}.sig")
        sign_file(args.file, args.priv, sig_file)
    elif args.command == "verify":
        sig_file = args.sig or Path(f"{args.file}.sig")
        success = verify_file(args.file, args.pub, sig_file)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
