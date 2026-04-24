import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface AuthStackProps extends cdk.StackProps {
  envName: string
}

/**
 * AuthStack — two Cognito User Pools (Internal + Supplier) with API Gateway JWT authorisers.
 * JWT validation occurs at API Gateway — ECS services receive pre-validated claims (CLAUDE.md §5.4).
 * OQ-06: RBAC roles for Internal User Pool TBD — Cognito groups scaffold included.
 */
export class AuthStack extends cdk.Stack {
  public readonly internalUserPool: cognito.UserPool
  public readonly supplierUserPool: cognito.UserPool
  public readonly internalUserPoolClient: cognito.UserPoolClient
  public readonly supplierUserPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)

    const passwordPolicy: cognito.PasswordPolicy = {
      minLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: true,
    }

    // Internal User Pool — Supply Chain Planners, Inventory Managers, Buyers
    this.internalUserPool = new cognito.UserPool(this, 'InternalUserPool', {
      userPoolName: `smartretail-internal-${props.envName}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy,
      mfa: cognito.Mfa.OPTIONAL,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: props.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    })

    // OQ-06: Groups correspond to personas — roles TBD
    const internalGroups = ['SupplyChainPlanner', 'InventoryManager', 'Buyer']
    for (const group of internalGroups) {
      new cognito.CfnUserPoolGroup(this, `InternalGroup-${group}`, {
        userPoolId: this.internalUserPool.userPoolId,
        groupName: group,
        description: `SmartRetail internal role: ${group}`,
      })
    }

    this.internalUserPoolClient = this.internalUserPool.addClient('InternalAppClient', {
      userPoolClientName: `smartretail-internal-client-${props.envName}`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: false, // SRP only — no plain-text password auth
      },
      accessTokenValidity: cdk.Duration.hours(8),
      idTokenValidity: cdk.Duration.hours(8),
      refreshTokenValidity: cdk.Duration.days(30),
    })

    // Supplier User Pool — separate pool for external suppliers
    this.supplierUserPool = new cognito.UserPool(this, 'SupplierUserPool', {
      userPoolName: `smartretail-supplier-${props.envName}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy,
      mfa: cognito.Mfa.OPTIONAL,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: props.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    })

    this.supplierUserPoolClient = this.supplierUserPool.addClient('SupplierAppClient', {
      userPoolClientName: `smartretail-supplier-client-${props.envName}`,
      generateSecret: false,
      authFlows: { userSrp: true },
      accessTokenValidity: cdk.Duration.hours(4),
      idTokenValidity: cdk.Duration.hours(4),
      refreshTokenValidity: cdk.Duration.days(7),
    })

    // Outputs for frontend env config
    new cdk.CfnOutput(this, 'InternalUserPoolId', { value: this.internalUserPool.userPoolId })
    new cdk.CfnOutput(this, 'InternalClientId', { value: this.internalUserPoolClient.userPoolClientId })
    new cdk.CfnOutput(this, 'SupplierUserPoolId', { value: this.supplierUserPool.userPoolId })
    new cdk.CfnOutput(this, 'SupplierClientId', { value: this.supplierUserPoolClient.userPoolClientId })

    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
  }
}
