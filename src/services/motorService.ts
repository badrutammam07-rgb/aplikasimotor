import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MotorRecord, AppConfig } from '../types';
import { formatElapsedDays, isLunasExpired } from '../data/initialData';

const MOTORS_COLLECTION = 'motors';
const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'general';

function cleanRecordForFirestore<T extends Record<string, any>>(record: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Subscribe to real-time updates for all motors in Firestore.
 * Anyone with the link will receive live updates when any admin adds, edits, or deletes data.
 */
export function subscribeToMotors(
  onData: (motors: MotorRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const collRef = collection(db, MOTORS_COLLECTION);

  const unsubscribe = onSnapshot(
    collRef,
    (snapshot) => {
      const records: MotorRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const record: MotorRecord = {
          id: docSnap.id,
          tanggal: data.tanggal || new Date().toISOString().split('T')[0],
          motor: data.motor || '',
          tahun: String(data.tahun || ''),
          nopol: data.nopol || '',
          hari: formatElapsedDays(data.tanggal),
          nominal: typeof data.nominal === 'number' ? data.nominal : 0,
          pemasukan: typeof data.pemasukan === 'number' ? data.pemasukan : 0,
          jasaParkir: typeof data.jasaParkir === 'number' ? data.jasaParkir : (typeof data.tarifJasa === 'number' ? data.tarifJasa : 0),
          tarifJasa: typeof data.tarifJasa === 'number' ? data.tarifJasa : (typeof data.jasaParkir === 'number' ? data.jasaParkir : 0),
          kepemilikan: data.kepemilikan || 'pecel',
          lunas: !!data.lunas,
          lunasAt: data.lunasAt || undefined,
          catatan: data.catatan || '',
          statusKirimPecel: data.statusKirimPecel || undefined,
          nominalKirimPecel: typeof data.nominalKirimPecel === 'number' ? data.nominalKirimPecel : undefined,
          tanggalKirimPecel: data.tanggalKirimPecel || undefined,
          catatanKirimPecel: data.catatanKirimPecel || undefined,
          pemasukanConfirmedByPecel: !!data.pemasukanConfirmedByPecel,
          pemasukanConfirmedAt: data.pemasukanConfirmedAt || undefined
        };

        // Filter motor lunas yang sudah kadaluarsa (hilang otomatis setelah 7 hari)
        if (!(record.lunas && isLunasExpired(record.lunasAt))) {
          records.push(record);
        }
      });

      // Sort descending by tanggal/id
      records.sort((a, b) => {
        const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
      });

      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MOTORS_COLLECTION);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to app configuration (logo, etc.) in real-time
 */
export function subscribeToAppConfig(
  onData: (config: AppConfig) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : null,
          appTitle: data.appTitle || 'MOTORKU'
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/${CONFIG_DOC_ID}`);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Add a new motor record to Firestore.
 */
export async function addMotor(record: MotorRecord): Promise<void> {
  const docRef = doc(db, MOTORS_COLLECTION, record.id);
  const data = cleanRecordForFirestore({
    ...record,
    tahun: String(record.tahun),
    updatedAt: new Date().toISOString()
  });
  try {
    await setDoc(docRef, data);
    console.log(`[Firestore] Successfully added motor ${record.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MOTORS_COLLECTION}/${record.id}`);
    throw error;
  }
}

/**
 * Update an existing motor record in Firestore.
 */
export async function updateMotor(id: string, updatedFields: Partial<MotorRecord>): Promise<void> {
  const docRef = doc(db, MOTORS_COLLECTION, id);
  const fieldsToSave: Record<string, any> = { ...updatedFields, updatedAt: new Date().toISOString() };
  if (updatedFields.tahun !== undefined) {
    fieldsToSave.tahun = String(updatedFields.tahun);
  }
  const data = cleanRecordForFirestore(fieldsToSave);
  try {
    await updateDoc(docRef, data);
    console.log(`[Firestore] Successfully updated motor ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MOTORS_COLLECTION}/${id}`);
    throw error;
  }
}

/**
 * Delete a motor record permanently from Firestore.
 */
export async function deleteMotor(id: string): Promise<void> {
  const cleanId = typeof id === 'string' ? id.trim() : '';
  if (!cleanId) {
    console.warn('deleteMotor called with invalid id:', id);
    return;
  }
  
  try {
    // 1. Direct document deletion by ID
    const docRef = doc(db, MOTORS_COLLECTION, cleanId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Successfully deleted motor doc ${cleanId}`);

    // 2. Also check if there are any documents with field id === cleanId (to prevent ghost duplicates)
    try {
      const q = query(collection(db, MOTORS_COLLECTION), where('id', '==', cleanId));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const batch = writeBatch(db);
        querySnap.forEach((docItem) => {
          batch.delete(docItem.ref);
        });
        await batch.commit();
        console.log(`[Firestore] Removed ${querySnap.size} matching records for id ${cleanId}`);
      }
    } catch (queryErr) {
      console.warn('[Firestore] Secondary query cleanup error (non-fatal):', queryErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MOTORS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

/**
 * Update app config (e.g. logo) in Firestore.
 */
export async function updateAppConfig(config: Partial<AppConfig>): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  const data = cleanRecordForFirestore({
    ...config,
    updatedAt: new Date().toISOString()
  });
  try {
    await setDoc(docRef, data, { merge: true });
    console.log('[Firestore] Successfully updated app config');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CONFIG_COLLECTION}/${CONFIG_DOC_ID}`);
    throw error;
  }
}

/**
 * Seed initial motor records if Firestore is completely empty on initial setup
 */
export async function seedInitialMotorsIfEmpty(initialList: MotorRecord[]): Promise<void> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const configSnap = await getDoc(configRef);
    const configData = configSnap.data();

    // Check if Firestore is already populated or marked seeded
    const snapshot = await getDocs(collection(db, MOTORS_COLLECTION));
    if (!snapshot.empty) {
      if (!configData?.isSeeded) {
        await setDoc(configRef, { isSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return;
    }

    if (configData?.isSeeded) {
      // Intentionally empty collection (e.g. all motors deleted or none added yet)
      return;
    }

    if (initialList.length > 0) {
      const batch = writeBatch(db);
      for (const item of initialList) {
        const docRef = doc(db, MOTORS_COLLECTION, item.id);
        batch.set(docRef, cleanRecordForFirestore({
          ...item,
          tahun: String(item.tahun),
          updatedAt: new Date().toISOString()
        }));
      }
      batch.set(configRef, { isSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
      await batch.commit();
      console.log(`[Firestore] Successfully seeded ${initialList.length} initial motors to Firestore.`);
    }
  } catch (e) {
    console.warn('Error while checking or seeding initial motors:', e);
  }
}
