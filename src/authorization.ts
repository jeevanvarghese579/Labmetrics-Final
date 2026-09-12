import type { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from './firebase';

export const FIREBASE_APP_ID = app.options.appId!;
export const APP_DISPLAY_NAME = 'LabMetrics Private';

export interface AccessResult {
  allowed: boolean;
  requestStatus: string | null;
  uid: string;
  role: string | null;
  signInProvider: string | null;
  emailVerified: boolean;
  requireEmailVerification: boolean;
  resolvedPermission: Record<string, unknown> | null;
  canonicalAccessDocument: Record<string, unknown> | null;
}

const checkMyAccess = httpsCallable(functions, 'checkMyAccess');
const requestAppAccess = httpsCallable(functions, 'requestAppAccess');

export async function checkCurrentUserAccess(user: User): Promise<AccessResult> {
  const email = user.email?.trim().toLowerCase() || null;
  console.info('[LabMetrics Auth] Checking application access', {
    uid: user.uid,
    email,
    projectId: app.options.projectId,
    appId: FIREBASE_APP_ID,
    canonicalPath: `accessUsers/${user.uid}`,
  });

  const result = await checkMyAccess({ appId: FIREBASE_APP_ID });
  const data = result.data && typeof result.data === 'object'
    ? result.data as Record<string, unknown>
    : {};
  const access: AccessResult = {
    allowed: data.allowed === true,
    requestStatus: typeof data.requestStatus === 'string' ? data.requestStatus : null,
    uid: typeof data.uid === 'string' ? data.uid : user.uid,
    role: typeof data.role === 'string' ? data.role : null,
    signInProvider: typeof data.signInProvider === 'string' ? data.signInProvider : null,
    emailVerified: data.emailVerified === true,
    requireEmailVerification: data.requireEmailVerification === true,
    resolvedPermission: data.resolvedPermission && typeof data.resolvedPermission === 'object'
      ? data.resolvedPermission as Record<string, unknown>
      : null,
    canonicalAccessDocument: data.canonicalAccessDocument && typeof data.canonicalAccessDocument === 'object'
      ? data.canonicalAccessDocument as Record<string, unknown>
      : null,
  };

  console.info('[LabMetrics Auth] Application access resolved', {
    uid: access.uid,
    email,
    projectId: app.options.projectId,
    appId: FIREBASE_APP_ID,
    allowed: access.allowed,
    accountActive: access.canonicalAccessDocument?.active ?? null,
    permission: access.resolvedPermission,
    canonicalAccessDocument: access.canonicalAccessDocument,
  });
  return access;
}

export async function requestCurrentUserAccess(requestType = 'access-request') {
  const result = await requestAppAccess({ appId: FIREBASE_APP_ID, requestType });
  return result.data && typeof result.data === 'object'
    ? result.data as Record<string, unknown>
    : {};
}
