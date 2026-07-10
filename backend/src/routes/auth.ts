import { Hono } from "hono";
import { z } from "zod";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  username: z.string().min(1),
});

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const resendCodeSchema = z.object({
  email: z.string().email(),
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
    const name = (err as Error).name;
    if (name === "UsernameExistsException") {
      return c.json({ error: { code: "USER_EXISTS", message: "User already exists" } }, 409);
    }
    if (name === "InvalidPasswordException") {
      return c.json(
        {
          error: {
            code: "INVALID_PASSWORD",
            message: (err as Error).message,
          },
        },
        400
      );
    }
    console.error("Signup error:", err);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
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
    const name = (err as Error).name;
    if (name === "CodeMismatchException") {
      return c.json(
        { error: { code: "CODE_MISMATCH", message: "Invalid verification code" } },
        400
      );
    }
    if (name === "ExpiredCodeException") {
      return c.json({ error: { code: "EXPIRED_CODE", message: (err as Error).message } }, 400);
    }
    console.error("Confirm error:", err);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
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
    console.error("Signin error:", err);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  }
});

authRoute.post("/resend-code", async (c) => {
  const body = await c.req.json();
  const parsed = resendCodeSchema.safeParse(body);
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

  const { email } = parsed.data;

  try {
    await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: CLIENT_ID,
        Username: email,
      })
    );

    return c.json({ sent: true });
  } catch (err) {
    console.error("Resend code error:", err);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  }
});
