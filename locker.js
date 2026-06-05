const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

function showUsage() {
  console.log(`
🔒 File Locker CLI - Secure Your Files with a Password

Usage:
  node locker.js encrypt <file-path> <password>
  node locker.js decrypt <encrypted-file-path> <password>

Examples:
  node locker.js encrypt notes.txt mySuperSecret123
  node locker.js decrypt notes.txt.enc mySuperSecret123
`);
}

function deriveKey(password, salt) {
  // Derive a strong 32-byte key from password using scrypt
  return crypto.scryptSync(password, salt, KEY_LENGTH);
}

function encrypt(filePath, password) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at '${filePath}'`);
    process.exit(1);
  }

  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.error(`❌ Error: '${filePath}' is a directory. Locker currently supports securing individual files.`);
      process.exit(1);
    }

    const plaintext = fs.readFileSync(filePath);
    
    // Generate secure random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key
    const key = deriveKey(password, salt);
    
    // Encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    
    // Package: [Salt (16 bytes)][IV (16 bytes)][Ciphertext (rest of file)]
    const resultPayload = Buffer.concat([salt, iv, ciphertext]);
    
    const outputFilePath = filePath + '.enc';
    fs.writeFileSync(outputFilePath, resultPayload);
    
    // Safely shred/delete original file
    fs.unlinkSync(filePath);
    
    console.log(`\n🔑 Success! File encrypted.`);
    console.log(`📁 Encrypted file saved to: ${outputFilePath}`);
    console.log(`🚨 Original file '${path.basename(filePath)}' has been deleted for safety.`);
  } catch (err) {
    console.error('❌ Encryption failed:', err.message);
    process.exit(1);
  }
}

function decrypt(filePath, password) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at '${filePath}'`);
    process.exit(1);
  }

  if (!filePath.endsWith('.enc')) {
    console.warn(`⚠️ Warning: File extension is not '.enc'. Running decryption anyway.`);
  }

  try {
    const payload = fs.readFileSync(filePath);
    
    if (payload.length < SALT_LENGTH + IV_LENGTH) {
      console.error('❌ Error: File is too small or corrupted.');
      process.exit(1);
    }
    
    // Unpack salt, IV and ciphertext
    const salt = payload.subarray(0, SALT_LENGTH);
    const iv = payload.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = payload.subarray(SALT_LENGTH + IV_LENGTH);
    
    // Derive key using the unpacked salt
    const key = deriveKey(password, salt);
    
    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    
    // Deduce original filename (remove .enc extension if present)
    let outputFilePath = filePath;
    if (filePath.endsWith('.enc')) {
      outputFilePath = filePath.slice(0, -4);
    } else {
      outputFilePath = filePath + '.decrypted';
    }
    
    fs.writeFileSync(outputFilePath, plaintext);
    
    // Delete encrypted locker file
    fs.unlinkSync(filePath);
    
    console.log(`\n🔓 Success! File decrypted.`);
    console.log(`📁 Restored file saved to: ${outputFilePath}`);
  } catch (err) {
    console.error('\n❌ Decryption failed! Incorrect password or corrupted file.');
    process.exit(1);
  }
}

// CLI Routing
const args = process.argv.slice(2);
if (args.length < 3) {
  showUsage();
  process.exit(1);
}

const action = args[0].toLowerCase();
const filePath = args[1];
const password = args[2];

if (action === 'encrypt') {
  encrypt(filePath, password);
} else if (action === 'decrypt') {
  decrypt(filePath, password);
} else {
  showUsage();
  process.exit(1);
}
