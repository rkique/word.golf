import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def generate_salt(length: int = 4) -> bytes:
    return os.urandom(length)

def Hash(data: bytes) -> bytes:
    digest = hashes.Hash(hashes.SHA512())
    digest.update(data)
    return digest.finalize()

def PasswordKDF(password: str, salt: bytes, keyLen: int) -> bytes:

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=keyLen,
        salt=salt,
        iterations=1000, # maybe change to 10000 in the future 
    )
    key = kdf.derive(password.encode())
    return key
