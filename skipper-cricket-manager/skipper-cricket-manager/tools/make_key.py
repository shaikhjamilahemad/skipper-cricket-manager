"""Deterministic signing key for Skipper, so any future rebuild signs with the same certificate
(Android only installs an update over an existing app if the signing certificate matches).
The key is derived from a fixed passphrase. This is fine for a personal, unpublished app;
never use this approach for anything published."""
import hashlib, datetime, sys, os
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import hashes, serialization
from cryptography import x509
from cryptography.x509.oid import NameOID

PASS = b'skipper-cricket-manager/jamil/2026-10-20/v1'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'keys')
os.makedirs(OUT, exist_ok=True)

class DRBG:
    def __init__(self, seed): self.seed = seed; self.n = 0
    def bytes(self, k):
        out = b''
        while len(out) < k:
            out += hashlib.sha256(self.seed + self.n.to_bytes(8, 'big')).digest(); self.n += 1
        return out[:k]
    def int(self, bits): return int.from_bytes(self.bytes(bits // 8), 'big')

SMALL = [p for p in range(3, 2000) if all(p % q for q in range(2, int(p ** 0.5) + 1))]
def is_prime(n, rng):
    if n < 2: return False
    for p in SMALL:
        if n % p == 0: return n == p
    d, s = n - 1, 0
    while d % 2 == 0: d //= 2; s += 1
    for _ in range(48):
        a = 2 + rng.int(1024) % (n - 3)
        x = pow(a, d, n)
        if x in (1, n - 1): continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1: break
        else: return False
    return True

def prime(rng, bits, e):
    while True:
        c = rng.int(bits) | (3 << (bits - 2)) | 1
        if (c - 1) % e != 0 and is_prime(c, rng): return c

rng = DRBG(hashlib.sha256(PASS).digest())
e = 65537
p = prime(rng, 1024, e); q = prime(rng, 1024, e)
if p < q: p, q = q, p
n = p * q; phi = (p - 1) * (q - 1)
d = pow(e, -1, phi)
key = rsa.RSAPrivateNumbers(p, q, d, d % (p - 1), d % (q - 1), pow(q, -1, p), rsa.RSAPublicNumbers(e, n)).private_key()
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Skipper'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Jamil (personal build)')])
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
        .serial_number(20261020).not_valid_before(datetime.datetime(2026, 10, 20, tzinfo=datetime.timezone.utc))
        .not_valid_after(datetime.datetime(2076, 10, 20, tzinfo=datetime.timezone.utc)).sign(key, hashes.SHA256()))
open(f'{OUT}/skipper.pk8', 'wb').write(key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
open(f'{OUT}/skipper.x509.pem', 'wb').write(cert.public_bytes(serialization.Encoding.PEM))
print('cert sha256', hashlib.sha256(cert.public_bytes(serialization.Encoding.DER)).hexdigest())
