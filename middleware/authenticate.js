import jwt from "jsonwebtoken";

export function authenticateAccessToken(request, response, next) {
  try {
    const authorizationHeader = request.headers.authorization || "";
    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return response.status(401).json({ 
        success: false,
        message: "Missing or invalid Authorization header" 
      });
    }

    const accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessTokenSecret) {
      console.error("❌ JWT_ACCESS_SECRET not configured");
      return response.status(500).json({ 
        success: false,
        message: "Server misconfiguration" 
      });
    }

    const decodedAccessToken = jwt.verify(token, accessTokenSecret);

    if (decodedAccessToken?.token_type !== "access") {
      return response.status(401).json({ 
        success: false,
        message: "Invalid token type" 
      });
    }

    request.authenticatedUser = {
      userId: decodedAccessToken.sub,
      emailAddress: decodedAccessToken.email,
      role: decodedAccessToken.role,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ 
        success: false,
        message: "Access token has expired" 
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return response.status(401).json({ 
        success: false,
        message: "Invalid access token" 
      });
    }

    return response.status(401).json({ 
      success: false,
      message: "Authentication failed" 
    });
  }
}

export default authenticateAccessToken;
