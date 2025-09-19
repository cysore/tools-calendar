/**
 * NextAuth.js configuration with AWS Cognito integration
 */

import { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { AUTH_CONFIG, getAuthEnvironment } from './auth-config';

// Configure DynamoDB client
const client = new DynamoDBClient({
  region: AUTH_CONFIG.DYNAMODB.REGION,
  credentials: {
    accessKeyId: AUTH_CONFIG.DYNAMODB.ACCESS_KEY_ID || '',
    secretAccessKey: AUTH_CONFIG.DYNAMODB.SECRET_ACCESS_KEY || '',
  },
});

const dynamodb = DynamoDBDocument.from(client);
const authEnv = getAuthEnvironment();

export const authOptions: NextAuthOptions = {
  adapter: DynamoDBAdapter(dynamodb, {
    tableName: AUTH_CONFIG.DYNAMODB.TABLE_NAME,
  }),
  providers: [
    CognitoProvider({
      clientId: AUTH_CONFIG.COGNITO.CLIENT_ID!,
      clientSecret: AUTH_CONFIG.COGNITO.CLIENT_SECRET!,
      issuer: AUTH_CONFIG.COGNITO.ISSUER!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONFIG.SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: AUTH_CONFIG.JWT_MAX_AGE,
  },
  pages: {
    signIn: AUTH_CONFIG.ROUTES.SIGNIN,
    error: AUTH_CONFIG.ROUTES.ERROR,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }

      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string;
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log('User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
      });
    },
    async signOut({ session, token }) {
      console.log('User signed out:', { userId: token?.userId });
    },
    async createUser({ user }) {
      console.log('New user created:', { userId: user.id, email: user.email });
    },
  },
  debug: authEnv.debug,
};
