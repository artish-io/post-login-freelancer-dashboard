import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import path from 'path';
import fs from 'fs/promises';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🧪 Trying to authorize:', credentials);

        try {
          const filePath = path.join(process.cwd(), 'data', 'users.json');
          const file = await fs.readFile(filePath, 'utf-8');
          const users = JSON.parse(file);

          const user = users.find(
            (u: any) =>
              u.username === credentials?.username &&
              u.password === credentials?.password
          );

          if (user) {
            const { id, name, email, avatar } = user;

            return {
              id: String(id),
              name,
              email,
              image: avatar,
            };
          }

          console.warn('❌ No match found for credentials:', credentials);
          return null;
        } catch (err) {
          console.error('🔥 Error reading users.json:', err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.name = typeof token.name === 'string' ? token.name : undefined;
      session.user.email = typeof token.email === 'string' ? token.email : undefined;
      session.user.image = typeof token.image === 'string' ? token.image : undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login-dev',
  },
  secret: process.env.NEXTAUTH_SECRET,
};