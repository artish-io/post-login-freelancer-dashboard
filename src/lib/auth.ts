import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateUser } from './storage/unified-storage-service';

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
          if (!credentials?.username || !credentials?.password) {
            console.warn('❌ Missing username or password');
            return null;
          }

          // Use unified storage service for authentication
          const user = await authenticateUser(credentials.username, credentials.password);

          if (user) {
            const { id, name, email, avatar, type } = user;

            console.log('✅ Authentication successful for user:', { id, name, type });
            return {
              id: String(id),
              name,
              email,
              image: avatar,
              userType: type, // Add user type for routing
            };
          }

          console.warn('❌ No match found for credentials:', credentials);
          return null;
        } catch (err) {
          console.error('🔥 Error during authentication:', err);
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
        token.userType = (user as any).userType; // Include user type in token
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.name = typeof token.name === 'string' ? token.name : undefined;
      session.user.email = typeof token.email === 'string' ? token.email : undefined;
      session.user.image = typeof token.image === 'string' ? token.image : undefined;
      (session.user as any).userType = token.userType; // Include user type in session
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};