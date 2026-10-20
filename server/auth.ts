import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { User, Workspace, UserPermissions } from './types';

export interface AuthenticatedRequest extends Request {
  workspace: Workspace;
  user: User;
}

// Multi-tenant isolation middleware: every endpoint checks caller's workspace & user on server (Q2)
export const tenantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspace_id as string);
  const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string);

  if (!workspaceId) {
    res.status(401).json({
      error: 'Unauthorized: Missing required X-Workspace-Id header for tenant isolation.'
    });
    return;
  }

  const workspace = db.getWorkspace(workspaceId);
  if (!workspace) {
    res.status(403).json({
      error: `Forbidden: Workspace "${workspaceId}" does not exist or access denied.`
    });
    return;
  }

  // Lookup user or fallback to first owner in workspace
  let user: User | undefined;
  if (userId) {
    user = db.getUser(userId);
    // CRITICAL: Ensure user belongs strictly to this workspace (prevent cross-tenant hijacking)
    if (user && user.workspace_id !== workspaceId) {
      res.status(403).json({
        error: `Forbidden: User "${userId}" does not belong to workspace "${workspaceId}". Cross-tenant access blocked.`
      });
      return;
    }
  }

  if (!user) {
    // Default to first user in workspace if user header omitted
    const wsUsers = db.getUsers(workspaceId);
    user = wsUsers[0];
  }

  if (!user) {
    res.status(403).json({
      error: `Forbidden: No valid user found for workspace "${workspaceId}".`
    });
    return;
  }

  (req as AuthenticatedRequest).workspace = workspace;
  (req as AuthenticatedRequest).user = user;
  next();
};

// Granular RBAC permission check middleware
export const requirePermission = (permission: keyof UserPermissions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Unauthorized: No active user session' });
      return;
    }

    // Owner role always has full permissions
    if (authReq.user.role === 'owner') {
      return next();
    }

    if (!authReq.user.permissions || !authReq.user.permissions[permission]) {
      res.status(403).json({
        error: `Forbidden: Current user "${authReq.user.name}" (${authReq.user.role.toUpperCase()}) lacks permission: "${permission}". Server-side security enforcement.`
      });
      return;
    }

    next();
  };
};

// Mask opportunity value if user lacks view_opportunity_value permission (F1.4)
export const sanitizeOpportunityForUser = (opp: any, user: User) => {
  if (user.role === 'owner' || user.permissions?.view_opportunity_value) {
    return opp;
  }
  return {
    ...opp,
    value: null,
    is_value_masked: true
  };
};

export const sanitizeOpportunitiesForUser = (opps: any[], user: User) => {
  if (user.role === 'owner' || user.permissions?.view_opportunity_value) {
    return opps;
  }
  return opps.map(o => sanitizeOpportunityForUser(o, user));
};
