import { Hono } from "hono";
import { z } from "zod";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(1),
});

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoute = new Hono();

authRoute.post("/signup", async (c) => {
  const body = await c.req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0].message,
        },
      },
      400
    );
  }

  const { email, password, username } = parsed.data;

  try {
    const result = await cognitoClient.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: username },
        ],
      })
    );

    return c.json(
      {
        userSub: result.UserSub,
        userConfirmed: result.UserConfirmed ?? false,
      },
      201
    );
  } catch (err) {
    if ((err as Error).name === "UsernameExistsException") {
      return c.json(
        {
          error: {
            code: "USER_EXISTS",
            message: "User already exists",
          },
        },
        409
      );
    }
    throw err;
  }
});

authRoute.post("/confirm", async (c) => {
  const body = await c.req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0].message,
        },
      },
      400
    );
  }

  const { email, code } = parsed.data;

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      })
    );

    return c.json({ confirmed: true });
  } catch (err) {
    if ((err as Error).name === "CodeMismatchException") {
      return c.json(
        {
          error: {
            code: "CODE_MISMATCH",
            message: "Invalid verification code",
          },
        },
        400
      );
    }
    throw err;
  }
});

authRoute.post("/signin", async (c) => {
  const body = await c.req.json();
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0].message,
        },
      },
      400
    );
  }

  const { email, password } = parsed.data;

  try {
    const result = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    const auth = result.AuthenticationResult;
    return c.json({
      idToken: auth?.IdToken,
      accessToken: auth?.AccessToken,
      refreshToken: auth?.RefreshToken,
    });
  } catch (err) {
    if ((err as Error).name === "NotAuthorizedException") {
      return c.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        401
      );
    }
    if ((err as Error).name === "UserNotConfirmedException") {
      return c.json(
        {
          error: {
            code: "USER_NOT_CONFIRMED",
            message: "Please verify your email first",
          },
        },
        403
      );
    }
    throw err;
  }
});
