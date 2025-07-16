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
    
    const encrypted = sodium.crypto_box_easy(
      messageBytes,
      sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES),
      recipientPubKey,
      senderPrivKey
    );
    
    return sodium.to_base64(encrypted);
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
    
    const decrypted = sodium.crypto_box_open_easy(
      encrypted,
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
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        store.put({ userId, privateKey });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('keys', { keyPath: 'userId' });
      };
    });
  }

  // Retrieve private key from secure storage
  static async getPrivateKey(userId: string): Promise<string | null> {
    const request = indexedDB.open('ArtishKeys', 1);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get(userId);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.privateKey || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }
}
