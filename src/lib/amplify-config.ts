/**
 * AWS Amplify Configuration
 */

import { Amplify } from 'aws-amplify';

// Amplify configuration using environment variables
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-west-2_yLfoofMwH',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '5p4br9u1hlpd7399fsc98obvgf',
      identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || 'us-west-2:05e89c27-5016-4940-90ed-0d0610d358c7',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: true,
        },
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig, {
  ssr: true, // Enable server-side rendering support
});

export { amplifyConfig };
export default amplifyConfig;