/**
 * Auth utilities for DRU and PECEL portals
 * - Permanent usernames: "DRU" and "PECEL"
 * - Default password: "123456"
 * - Secret master recovery code: "gh1gh415"
 */

export const DEFAULT_PASSWORD = '123456';
export const MASTER_RECOVERY_CODE = 'gh1gh415';

const STORAGE_KEYS = {
  dru: 'motorku_auth_dru_password_v1',
  pecel: 'motorku_auth_pecel_password_v1',
};

export type RoleType = 'dru' | 'pecel';

/**
 * Get current stored password for role, defaults to '123456'
 */
export function getStoredPassword(role: RoleType): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS[role]);
    if (saved && saved.trim() !== '') {
      return saved;
    }
  } catch (err) {
    console.error('Error reading auth password from localStorage:', err);
  }
  return DEFAULT_PASSWORD;
}

/**
 * Verify user login password
 */
export function verifyLoginPassword(role: RoleType, enteredPassword: string): boolean {
  const current = getStoredPassword(role);
  return enteredPassword.trim() === current.trim();
}

/**
 * Change password for role from settings
 */
export function changePassword(
  role: RoleType,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): { success: boolean; message: string } {
  const current = getStoredPassword(role);

  if (!oldPassword) {
    return { success: false, message: 'Password lama wajib diisi.' };
  }

  if (oldPassword.trim() !== current.trim()) {
    return { success: false, message: 'Password lama tidak sesuai.' };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, message: 'Password baru minimal 4 karakter.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'Konfirmasi password baru tidak cocok.' };
  }

  try {
    localStorage.setItem(STORAGE_KEYS[role], newPassword.trim());
    return { success: true, message: `Password ${role.toUpperCase()} berhasil diperbarui!` };
  } catch (err) {
    console.error('Error saving password:', err);
    return { success: false, message: 'Gagal menyimpan password ke penyimpanan lokal.' };
  }
}

/**
 * Reset password back to default '123456' using secret master code
 */
export function resetPasswordWithMasterCode(
  role: RoleType,
  enteredMasterCode: string
): { success: boolean; message: string } {
  if (!enteredMasterCode || enteredMasterCode.trim() === '') {
    return { success: false, message: 'Silakan masukkan kode pemulihan.' };
  }

  if (enteredMasterCode.trim() === MASTER_RECOVERY_CODE) {
    try {
      localStorage.setItem(STORAGE_KEYS[role], DEFAULT_PASSWORD);
      return {
        success: true,
        message: `Kode valid! Password ${role.toUpperCase()} telah dikembalikan normal ke default (${DEFAULT_PASSWORD}).`,
      };
    } catch (err) {
      console.error('Error resetting password:', err);
      return { success: false, message: 'Gagal mereset password ke memori.' };
    }
  }

  return {
    success: false,
    message: 'Kode pemulihan salah! Hubungi pengembang untuk kode pemulihan.',
  };
}
