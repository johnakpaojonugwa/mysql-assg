export function authorizeMiddleware(allowedRoles = []) {
  return (request, response, next) => {
    const authenticatedUser = request.authenticatedUser;

    if (!authenticatedUser) {
      return response.status(401).json({ 
        success: false,
        message: "Not authenticated" 
      });
    }

    if (!allowedRoles.includes(authenticatedUser.role)) {
      return response.status(403).json({ 
        success: false,
        message: `Insufficient permissions - required roles: ${allowedRoles.join(', ')}` 
      });
    }

    return next();
  };
}

export function requireAdminRole(request, response, next) {
  const authenticatedUser = request.authenticatedUser;

  if (!authenticatedUser) {
    return response.status(401).json({ 
      success: false,
      message: "Not authenticated" 
    });
  }

  if (authenticatedUser.role !== "admin") {
    return response.status(403).json({ 
      success: false,
      message: "Insufficient permissions - admin role required" 
    });
  }

  return next();
}

export default authorizeMiddleware;


