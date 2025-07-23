// src/lib/encryption.ts
import sodium from 'libsodium-wrappers';

export class MessageEncryption {
  private static initialized = false;

  static async init() {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  // Generate a new key pair for a user
  static async generateKeyPair() {
    await this.init();
    const keyPair = sodium.crypto_box_keypair();
    return {
      publicKey: sodium.to_base64(keyPair.publicKey),
      privateKey: sodium.to_base64(keyPair.privateKey)
    };
  }

  // Encrypt a message for a specific recipient
  static async encryptMessage(
    message: string,
    recipientPublicKey: string,
    senderPrivateKey: string
  ): Promise<string> {
    await this.init();
    
    const messageBytes = sodium.from_string(message);
    const recipientPubKey = sodium.from_base64(recipientPublicKey);
    const senderPrivKey = sodium.from_base64(senderPrivateKey);
    
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const ciphertext = sodium.crypto_box_easy(
      messageBytes,
      nonce,
      recipientPubKey,
      senderPrivKey
    );

    // Combine nonce and ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);

    return sodium.to_base64(combined);
  }

  // Decrypt a message
  static async decryptMessage(
    encryptedMessage: string,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<string> {
    await this.init();
    
    const encrypted = sodium.from_base64(encryptedMessage);
    const senderPubKey = sodium.from_base64(senderPublicKey);
    const recipientPrivKey = sodium.from_base64(recipientPrivateKey);
    
    // Extract nonce (first 24 bytes) and ciphertext (rest)
    const nonce = encrypted.slice(0, sodium.crypto_box_NONCEBYTES);
    const ciphertext = encrypted.slice(sodium.crypto_box_NONCEBYTES);

    const decrypted = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      senderPubKey,
      recipientPrivKey
    );
    
    return sodium.to_string(decrypted);
  }

  // Store private key securely in browser
  static async storePrivateKey(userId: string, privateKey: string) {
    // Use IndexedDB for secure storage
    const request = indexedDB.open('ArtishKeys', 1);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;

        // Check if the object store exists
        if (!db.objectStoreNames.contains('keys')) {
          // Close the database and reopen with version increment to trigger upgrade
          db.close();
          const upgradeRequest = indexedDB.open('ArtishKeys', 2);

          upgradeRequest.onupgradeneeded = () => {
            const upgradeDb = upgradeRequest.result;
            if (!upgradeDb.objectStoreNames.contains('keys')) {
              upgradeDb.createObjectStore('keys', { keyPath: 'userId' });
            }
          };

          upgradeRequest.onsuccess = () => {
            const upgradeDb = upgradeRequest.result;
            const transaction = upgradeDb.transaction(['keys'], 'readwrite');
            const store = transaction.objectStore('keys');
            store.put({ userId, privateKey });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
          };

          upgradeRequest.onerror = () => reject(upgradeRequest.error);
          return;
        }

        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        store.put({ userId, privateKey });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'userId' });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Retrieve private key from secure storage
  static async getPrivateKey(userId: string): Promise<string | null> {
    const request = indexedDB.open('ArtishKeys', 2);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;

        // Check if the object store exists
        if (!db.objectStoreNames.contains('keys')) {
          // Object store doesn't exist, return null (no key stored)
          resolve(null);
          return;
        }

        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get(userId);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.privateKey || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'userId' });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Reset the encryption database (useful for debugging)
  static async resetDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('ArtishKeys');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }
}
