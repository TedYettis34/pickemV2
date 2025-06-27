export const mockSend = jest.fn()

export const CognitoIdentityProviderClient = jest.fn().mockImplementation(() => ({
  send: mockSend
}))

export class SignUpCommand {
  constructor(public input: any) {}
}

export class ConfirmSignUpCommand {
  constructor(public input: any) {}
}

export class InitiateAuthCommand {
  constructor(public input: any) {}
}

export class ResendConfirmationCodeCommand {
  constructor(public input: any) {}
}

export const AuthFlowType = {
  USER_PASSWORD_AUTH: 'USER_PASSWORD_AUTH' as const,
}

