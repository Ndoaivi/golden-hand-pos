import type { Role } from '../../../../packages/domain/index.ts';

// Separate demo entry points. These helpers do not authenticate a real staff member.
export const portalPaths: Record<Role, string> = { cashier: '/pos', owner: '/admin' };

export function portalFromPath(path: string): Role {
    return path.replace(/\/$/, '') === portalPaths.owner ? 'owner' : 'cashier';
}

function sessionKey(portal: Role): string {
    return `golden-hand-demo-role-${portal}`;
}

export function readDemoRole(portal: Role): Role | null {
    try {
        return sessionStorage.getItem(sessionKey(portal)) === portal ? portal : null;
    } catch {
        return null;
    }
}

export function enterDemoPortal(portal: Role): void {
    try {
        sessionStorage.setItem(sessionKey(portal), portal);
    } catch { /* Allow a nonpersistent demo when session storage is unavailable. */ }
}

export function leaveDemoPortal(portal: Role): void {
    try {
        sessionStorage.removeItem(sessionKey(portal));
    } catch { /* The visible session still ends if session storage is unavailable. */ }
}
