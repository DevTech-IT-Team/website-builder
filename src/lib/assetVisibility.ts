import { getStoredUser } from '@/lib/authSession';

const STORAGE_KEY = 'buildora-user-visible-asset-ids';
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'INSTITUTION_ADMIN'];

export function getUserVisibleAssetIds(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

export function setUserVisibleAssetIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function isAdminGlobalAsset(asset: { scope?: string; isGlobal?: boolean }): boolean {
  return asset.scope === 'GLOBAL' || (asset.isGlobal === true && asset.scope !== 'USER');
}

export function isUserOwnedAsset(
  asset: { scope?: string; isGlobal?: boolean; ownerId?: string },
  userId?: string | null,
): boolean {
  if (!userId) return false;
  if (isAdminGlobalAsset(asset)) return false;
  return asset.scope === 'USER' || asset.ownerId === userId;
}

export function canDeleteAsset(asset: { scope?: string; isGlobal?: boolean; ownerId?: string }): boolean {
  const user = getStoredUser();
  if (!user?.id) return false;
  if (ADMIN_ROLES.includes(user.role || '')) return true;
  return isUserOwnedAsset(asset, user.id);
}

export function rememberAssetVisibleToUsers(id: string) {
  const ids = getUserVisibleAssetIds();
  if (ids === null || ids.includes(id)) return;
  setUserVisibleAssetIds([id, ...ids]);
}

export function isAssetVisibleToUsers(id: string, asset?: { scope?: string; isGlobal?: boolean; ownerId?: string }): boolean {
  if (asset && isAdminGlobalAsset(asset)) return true;
  const user = getStoredUser();
  if (asset && isUserOwnedAsset(asset, user?.id)) return true;
  const ids = getUserVisibleAssetIds();
  if (ids === null) return true;
  return ids.includes(id);
}

export function filterAssetsVisibleToUsers<T extends { id: string; scope?: string; isGlobal?: boolean; ownerId?: string }>(assets: T[]): T[] {
  const user = getStoredUser();
  return assets.filter((asset) => isAdminGlobalAsset(asset) || isUserOwnedAsset(asset, user?.id));
}
