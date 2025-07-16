// src/hooks/useEncryption.ts
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageEncryption } from '@/lib/encryption';

export function useEncryption() {
  const { data: session } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const initializeEncryption = async () => {
      try {
        // Check if user already has keys
        const existingPrivateKey = await MessageEncryption.getPrivateKey(session.user.id);
        
        if (existingPrivateKey) {
          // Load existing keys
          setPrivateKey(existingPrivateKey);
          
          // Fetch public key from server
          const response = await fetch(`/api/user/public-key/${session.user.id}`);
          const data = await response.json();
          setPublicKey(data.publicKey);
        } else {
          // Generate new key pair
          const keyPair = await MessageEncryption.generateKeyPair();
          
          // Store private key locally
          await MessageEncryption.storePrivateKey(session.user.id, keyPair.privateKey);
          
          // Send public key to server
          await fetch('/api/user/public-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              publicKey: keyPair.publicKey
            })
          });
          
          setPrivateKey(keyPair.privateKey);
          setPublicKey(keyPair.publicKey);
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
      }
    };

    initializeEncryption();
  }, [session?.user?.id]);

  const encryptMessage = async (message: string, recipientId: string) => {
    if (!privateKey) throw new Error('Private key not available');
    
    // Get recipient's public key
    const response = await fetch(`/api/user/public-key/${recipientId}`);
    const data = await response.json();
    
    return MessageEncryption.encryptMessage(message, data.publicKey, privateKey);
  };

  const decryptMessage = async (encryptedMessage: string, senderId: string) => {
    if (!privateKey) throw new Error('Private key not available');
    
    // Get sender's public key
    const response = await fetch(`/api/user/public-key/${senderId}`);
    const data = await response.json();
    
    return MessageEncryption.decryptMessage(encryptedMessage, data.publicKey, privateKey);
  };

  return {
    isReady,
    publicKey,
    encryptMessage,
    decryptMessage
  };
}
