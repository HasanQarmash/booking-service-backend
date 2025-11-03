import { Request, Response, NextFunction } from "express";
import { generateToken } from "../helpers/jwt";

export const googleAuthCallback = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.redirect("/api/auth/google/failure");
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    });

    // Send success response with token
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Sign-In Success</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: #4CAF50;
            margin-bottom: 20px;
          }
          .token-box {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            word-break: break-all;
            margin: 20px 0;
            border: 1px solid #ddd;
          }
          .user-info {
            margin: 20px 0;
            padding: 15px;
            background: #e8f5e9;
            border-radius: 5px;
          }
          button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
          }
          button:hover {
            background: #45a049;
          }
          .copy-btn {
            background: #2196F3;
          }
          .copy-btn:hover {
            background: #0b7dda;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Google Sign-In Successful!</h1>
          <div class="user-info">
            <h3>Welcome, ${user.full_name}!</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            ${user.profile_picture ? `<img src="${user.profile_picture}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; margin-top: 10px;">` : ""}
          </div>
          <p><strong>Your JWT Token:</strong></p>
          <div class="token-box" id="token">${token}</div>
          <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
          <button onclick="window.close()">Close Window</button>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Use this token in Postman with Bearer Authentication<br>
            Header: <code>Authorization: Bearer [token]</code>
          </p>
        </div>
        <script>
          function copyToken() {
            const token = document.getElementById('token').textContent;
            navigator.clipboard.writeText(token).then(() => {
              alert('Token copied to clipboard!');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Google auth callback error:", error);
    res.redirect("/api/auth/google/failure");
  }
};

export const googleAuthSuccess = (req: Request, res: Response) => {
  const user = req.user as any;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Not authenticated",
    });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
  });

  res.status(200).json({
    status: "success",
    message: "Google authentication successful",
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        profile_picture: user.profile_picture,
      },
      token,
    },
  });
};

export const googleAuthFailure = (_req: Request, res: Response) => {
  res.status(401).json({
    status: "fail",
    message: "Google authentication failed",
  });
};

export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        status: "error",
        message: "Error logging out",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  });
};
