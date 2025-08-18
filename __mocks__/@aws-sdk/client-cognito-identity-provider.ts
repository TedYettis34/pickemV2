export const mockSend = jest.fn()

export const CognitoIdentityProviderClient = jest.fn().mockImplementation(() => ({
  send: mockSend
}))

export class SignUpCommand {
  constructor(public input: unknown) {}
}

export class ConfirmSignUpCommand {
  constructor(public input: unknown) {}
}

export class InitiateAuthCommand {
  constructor(public input: unknown) {}
}

export class ResendConfirmationCodeCommand {
  constructor(public input: unknown) {}
}

export const AuthFlowType = {
  USER_PASSWORD_AUTH: 'USER_PASSWORD_AUTH' as const,
}

