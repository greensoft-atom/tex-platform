// src/core/service-errors.ts — errors that services throw; the HTTP layer maps them to the catalogue in 06 §5.6.
export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } }               // 404
export class VersionConflictError extends Error { constructor(m: string) { super(m); this.name = 'VersionConflictError'; } } // 409
export class InvalidTransitionError extends Error { constructor(m: string) { super(m); this.name = 'InvalidTransitionError'; } } // 409
export class ConflictOfInterestError extends Error { constructor(m: string) { super(m); this.name = 'ConflictOfInterestError'; } } // 403
export class ForbiddenActionError extends Error { constructor(m: string) { super(m); this.name = 'ForbiddenActionError'; } }     // 403
