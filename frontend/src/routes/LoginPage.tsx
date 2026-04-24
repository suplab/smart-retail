import React from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

/**
 * Cognito auth UI using AWS Amplify's pre-built Authenticator component.
 * No custom auth flows (CLAUDE.md §6.3).
 * Internal users and Supplier users are distinguished by Cognito User Pool — not by this component.
 */
export function LoginPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-700">SmartRetail</h1>
        <p className="text-gray-500 mt-2">Supply Chain Management Platform</p>
      </div>
      <div className="w-full max-w-md">
        <Authenticator />
      </div>
    </div>
  )
}
