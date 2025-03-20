import { Buff, Bytes } from '@cmdcode/buffy'
import { secp256k1 }   from '@noble/curves/secp256k1'
import { hmac }        from '@noble/hashes/hmac'
import { ripemd160 }   from '@noble/hashes/ripemd160'
import { sha256 }      from '@noble/hashes/sha256'

export { sha256 }

/**
 * Computes the hash-160 of the provided data.
 * @param data Variable number of byte arrays to be hashed.
 * @returns    The hexadecimal representation of the hash-160.
 */
export function hash160 (...data : Bytes[]) : string {
  // Join all input bytes into a single buffer
  const preimg = Buff.join(data)
  const digest = ripemd160(sha256(preimg))
  return Buff.uint(digest).hex
}

/**
 * Computes an HMAC-SHA256 of the provided data using the given secret.
 * @param secret The secret key for HMAC.
 * @param data   Variable number of byte arrays to be processed.
 * @returns      The hexadecimal representation of the HMAC digest.
 */
export function hmac256 (
  secret  : Bytes,
  ...data : Bytes[]
) : string {
  // Convert the secret to bytes if it's not already
  const seckey = Buff.bytes(secret)
  // Combine all data into one buffer
  const preimg = Buff.join(data)
  const digest = hmac(sha256, seckey, preimg)
  return Buff.uint(digest).hex
}

/**
 * Generates a public key from a private key using the secp256k1 curve.
 * @param secret The private key in byte format.
 * @returns      The public key in hexadecimal format.
 */
export function get_pubkey (
  secret : Bytes
) : string {
  // Convert secret to byte array if necessary
  const seckey = Buff.bytes(secret)
  // Generate public key from private key, compressed format
  const pubkey = secp256k1.getPublicKey(seckey, true)
  return Buff.uint(pubkey).hex
}

/**
 * Signs a message with ECDSA using secp256k1.
 * @param secret  The private key used for signing.
 * @param message The message to be signed.
 * @returns       The signature in DER encoded hexadecimal format.
 */
export function sign_ecdsa (
  secret  : Bytes,
  message : Bytes
) : string {
  // Convert secret to byte array if not already
  const seckey    = Buff.bytes(secret)
  // Convert message to byte array if not already
  const mbytes    = Buff.bytes(message)
  // Sign the message with the private key
  const signature = secp256k1.sign(mbytes, seckey)
  // Convert signature to DER encoded hex with low S-value
  return signature.toDERHex(true)
}