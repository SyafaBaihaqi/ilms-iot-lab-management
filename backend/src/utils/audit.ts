import { AuditService } from '../services/audit.service';

interface AuditRequestLike {
  user?: { userId?: string };
  ip?: string;
  headers?: Record<string, any>;
}

/**
 * Helper singkat untuk mencatat aktivitas dari dalam controller.
 * Pemakaian: await auditRequest(req, 'component.update', 'Component', id, { name });
 */
export const auditRequest = (
  req: AuditRequestLike,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, any> | null
) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) || req.ip || null;

  return AuditService.log({
    userId: req.user?.userId || null,
    action,
    entityType,
    entityId: entityId ?? null,
    ipAddress: ip,
    metadata: metadata ?? null
  });
};
