/**
 * Tenant Scoping Utility
 * Filters API responses to only include data belonging to the requesting tenant.
 * ADMIN users see all data. Tenant users see only their own.
 */

'use strict';

/**
 * Returns true if the user can access the given tenantId
 */
function canAccessTenant(user, tenantId) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.tenantId === tenantId || user.userId === tenantId;
}

/**
 * Filters an array of items to only those belonging to the user's tenant
 */
function filterByTenant(items, user, tenantField = 'tenantId') {
  if (!user || user.role === 'ADMIN') return items;
  return items.filter(item =>
    item[tenantField] === user.tenantId ||
    item[tenantField] === user.userId ||
    !item[tenantField] // include items with no tenant (shared/global)
  );
}

/**
 * Express middleware that adds tenant context to the request
 */
function tenantContext(req, res, next) {
  if (req.user) {
    req.tenantId = req.user.role === 'ADMIN'
      ? (req.query.tenantId || null) // admins can scope by query param
      : (req.user.tenantId || req.user.userId);
  }
  next();
}

/**
 * DynamoDB filter expression for tenant scoping
 */
function tenantFilter(user) {
  if (!user || user.role === 'ADMIN') return {};
  return {
    FilterExpression: 'tenantId = :tid OR attribute_not_exists(tenantId)',
    ExpressionAttributeValues: { ':tid': user.tenantId || user.userId },
  };
}

module.exports = { canAccessTenant, filterByTenant, tenantContext, tenantFilter };
