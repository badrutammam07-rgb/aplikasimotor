import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MotorTable from './components/MotorTable';
import Footer from './components/Footer';
import DruLoginModal from './components/DruLoginModal';
import DruModal from './components/DruModal';

import { MotorRecord, AppConfig, ActiveModal } from './types';
import { INITIAL_MOTOR_DATA, calculateElapsedDays, formatElapsedDays, isLunasExpired } from './data/initialData';
import {
  subscribeToMotors,
  subscribeToAppConfig,
  addMotor,
  updateMotor,
  deleteMotor,
  updateAppConfig,
  seedInitialMotorsIfEmpty
} from './services/motorService';
import { testFirestoreConnection } from './lib/firebase';

const STORAGE_KEY_RECORDS = 'motorku_records_v2';
const STORAGE_KEY_CONFIG = 'motorku_config_v2';
const STORAGE_KEY_DELETED_IDS = 'motorku_deleted_motor_ids_v2';

export default function App() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. Motor Data state: initialized from local cache (with deleted items filtered out), synchronized in real-time with Firestore
  const [motorData, setMotorData] = useState<MotorRecord[]>(() => {
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
      const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out motor yang sudah dihapus permanen atau motor lunas yang sudah kadaluarsa
          return parsed
            .filter((item: MotorRecord) => !deletedArr.includes(item.id) && !(item.lunas && isLunasExpired(item.lunasAt)))
            .map((item: MotorRecord) => ({
              ...item,
              hari: formatElapsedDays(item.tanggal),
              kepemilikan: item.kepemilikan || 'pecel',
              nominal: item.nominal !== undefined ? item.nominal : 0,
              pemasukan: item.pemasukan !== undefined ? item.pemasukan : 0,
              jasaParkir: item.jasaParkir !== undefined ? item.jasaParkir : item.tarifJasa || 0,
              tarifJasa: item.tarifJasa !== undefined ? item.tarifJasa : item.jasaParkir || 0,
              pemasukanConfirmedByPecel: item.pemasukanConfirmedByPecel !== undefined ? item.pemasukanConfirmedByPecel : false,
              lunas: item.lunas !== undefined ? !!item.lunas : false,
              lunasAt: item.lunasAt || undefined
            }));
        }
      }
    } catch (e) {
      console.error('Failed to load motor data from localStorage', e);
    }
    // Return empty array initially until Firestore real-time snapshot loads
    return [];
  });

  // 2. Config state (Logo & title)
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load config from localStorage', e);
    }
    return {
      logoUrl: null,
      appTitle: 'MOTORKU'
    };
  });

  // 3. Modals & Authentication State
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [activeRole, setActiveRole] = useState<'guest' | 'dru' | 'pecel'>('guest');

  // Real-time synchronization with Firestore
  useEffect(() => {
    // Check connection
    testFirestoreConnection();

    // Subscribe to real-time motor updates
    const unsubscribeMotors = subscribeToMotors(
      (liveMotors) => {
        setIsDataLoaded(true);

        // Filter out any locally deleted IDs so they never flicker back
        let safeMotors = liveMotors;
        try {
          const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
          if (savedDeleted) {
            const deletedArr: string[] = JSON.parse(savedDeleted);
            if (deletedArr.length > 0) {
              safeMotors = liveMotors.filter((m) => !deletedArr.includes(m.id));
            }
          }
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(safeMotors));
        } catch (e) {
          // ignore
        }

        setMotorData(safeMotors);
      },
      (err) => {
        console.warn('Firestore live sync listener error:', err);
        setIsDataLoaded(true);
      }
    );

    // Subscribe to real-time config updates (e.g. logo changes by DRU)
    const unsubscribeConfig = subscribeToAppConfig(
      (liveConfig) => {
        setConfig((prev) => ({
          ...prev,
          ...liveConfig
        }));
      },
      (err) => {
        console.warn('Firestore config listener error:', err);
      }
    );

    return () => {
      unsubscribeMotors();
      unsubscribeConfig();
    };
  }, []);

  // Sync local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(motorData));
    } catch (e) {
      console.error('Failed to save motor data to localStorage', e);
    }
  }, [motorData]);

  // Pembersihan otomatis: motor yang berstatus lunas akan hilang otomatis 1 Minggu (7 hari) setelah lunas
  useEffect(() => {
    setMotorData((prev) => {
      const activeRecords = prev.filter((item) => !(item.lunas && isLunasExpired(item.lunasAt)));
      if (activeRecords.length !== prev.length) {
        return activeRecords;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config to localStorage', e);
    }
  }, [config]);

  // Handler for Logo update by DRU - synced real-time
  const handleUpdateLogo = async (logoUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      logoUrl
    }));
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ ...config, logoUrl }));
    } catch (e) {
      console.error('Failed to sync config to localStorage', e);
    }
    await updateAppConfig({ logoUrl });
  };

  // Handler for adding motor from DRU - synced real-time
  const handleAddMotor = async (newRecord: Omit<MotorRecord, 'id'>) => {
    const recordWithId: MotorRecord = {
      ...newRecord,
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      hari: formatElapsedDays(newRecord.tanggal)
    };
    setMotorData((prev) => [recordWithId, ...prev]);
    await addMotor(recordWithId);
  };

  // Handler for updating motor from DRU - synced real-time
  const handleUpdateMotor = async (id: string, updatedFields: Partial<MotorRecord>) => {
    setMotorData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedDate = updatedFields.tanggal || item.tanggal;
          return {
            ...item,
            ...updatedFields,
            hari: formatElapsedDays(updatedDate)
          };
        }
        return item;
      })
    );
    await updateMotor(id, updatedFields);
  };

  // Handler for deleting motor from DRU - permanently synced to Firestore
  const handleDeleteMotor = async (id: string) => {
    const cleanId = typeof id === 'string' ? id.trim() : '';
    if (!cleanId) return;

    // 1. Immediately remove from local state and update tombstone
    setMotorData((prev) => {
      const updated = prev.filter((item) => item.id !== cleanId);
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
        const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
        const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
        if (!deletedArr.includes(cleanId)) {
          deletedArr.push(cleanId);
          localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(deletedArr));
        }
      } catch (e) {
        console.error('Failed to sync deletion to localStorage', e);
      }
      return updated;
    });

    // 2. Permanently delete from Firestore database
    try {
      await deleteMotor(cleanId);
      console.log(`[DRU] Unit ${cleanId} permanently deleted from database`);
    } catch (err) {
      console.error(`[DRU] Failed to delete unit ${cleanId} from database:`, err);
      throw err;
    }
  };

  // Handler for resetting motor data to demo initial (clears deletion tombstones)
  const handleResetMotorData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_DELETED_IDS);
    } catch (e) {
      // ignore
    }
    setMotorData(INITIAL_MOTOR_DATA);
    seedInitialMotorsIfEmpty(INITIAL_MOTOR_DATA);
  };

  // Handler for marking motor LUNAS or BATAL LUNAS - synced real-time
  const handleToggleLunas = (id: string, isLunas?: boolean) => {
    let updatePayload: Partial<MotorRecord> = {};
    setMotorData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextLunas = isLunas !== undefined ? isLunas : !item.lunas;
          updatePayload = {
            lunas: nextLunas,
            lunasAt: nextLunas ? (item.lunasAt || new Date().toISOString()) : undefined
          };
          return {
            ...item,
            ...updatePayload
          };
        }
        return item;
      })
    );
    if (id && Object.keys(updatePayload).length > 0) {
      updateMotor(id, updatePayload).catch((err) => {
        console.error('Failed to sync lunas status to Firestore:', err);
      });
    }
  };

  // Handler for DRU sending nominal pemasukan to Pecel - synced real-time
  const handleSendPemasukanToPecel = (recordId: string, amount: number, notes?: string) => {
    const payload: Partial<MotorRecord> = {
      nominalKirimPecel: amount,
      statusKirimPecel: 'terkirim',
      tanggalKirimPecel: new Date().toISOString().split('T')[0],
      catatanKirimPecel: notes || '',
      pemasukanConfirmedByPecel: false
    };
    setMotorData((prev) =>
      prev.map((item) => {
        if (item.id === recordId) {
          return {
            ...item,
            ...payload
          };
        }
        return item;
      })
    );
    updateMotor(recordId, payload).catch((err) => {
      console.error('Failed to sync send pemasukan to Firestore:', err);
    });
  };

  // Handler for Pecel income confirmation - synced real-time
  const handleConfirmPemasukanPecel = (recordId: string, amount: number) => {
    const payload: Partial<MotorRecord> = {
      pemasukan: amount,
      nominalKirimPecel: amount,
      statusKirimPecel: 'dikonfirmasi',
      pemasukanConfirmedByPecel: true,
      pemasukanConfirmedAt: new Date().toISOString().split('T')[0]
    };
    setMotorData((prev) =>
      prev.map((item) => {
        if (item.id === recordId) {
          return {
            ...item,
            ...payload
          };
        }
        return item;
      })
    );
    updateMotor(recordId, payload).catch((err) => {
      console.error('Failed to sync confirmation to Firestore:', err);
    });
  };

  const handleCancelConfirmPemasukanPecel = (recordId: string) => {
    const currentItem = motorData.find((m) => m.id === recordId);
    const payload: Partial<MotorRecord> = {
      pemasukan: 0,
      pemasukanConfirmedByPecel: false,
      pemasukanConfirmedAt: undefined,
      statusKirimPecel: currentItem?.nominalKirimPecel ? 'terkirim' : undefined
    };
    setMotorData((prev) =>
      prev.map((item) => {
        if (item.id === recordId) {
          return {
            ...item,
            ...payload
          };
        }
        return item;
      })
    );
    updateMotor(recordId, payload).catch((err) => {
      console.error('Failed to sync cancel confirmation to Firestore:', err);
    });
  };

  // Editing Motor Trigger from Table
  const [editingMotorId, setEditingMotorId] = useState<string | null>(null);

  const handleStartEditFromTable = (record: MotorRecord) => {
    setEditingMotorId(record.id);
    setActiveModal('dru_panel');
  };

  // Auth Handlers
  const handleDruLoginSuccess = () => {
    setActiveRole('dru');
    setActiveModal('dru_panel');
  };

  const handlePecelLoginSuccess = () => {
    setActiveRole('pecel');
    setActiveModal('pecel_panel');
  };

  const handleLogout = () => {
    setActiveRole('guest');
    setActiveModal('none');
    setEditingMotorId(null);
  };

  return (
    <div 
      id="motorku-app" 
      className="h-screen h-[100dvh] max-h-screen w-full flex flex-col justify-between bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950 overflow-hidden"
    >
      {/* 1. Header: LOGO (diatur DRU), Judul MOTORKU, HANYA SATU LOGO PINTU */}
      <Header
        config={config}
        activeRole={activeRole}
        onOpenPortalDoors={() => setActiveModal('portal_doors')}
        onOpenDruPanel={() => setActiveModal('dru_panel')}
        onOpenPecelPanel={() => setActiveModal('pecel_panel')}
        onLogout={handleLogout}
        onGoHome={() => setActiveModal('none')}
      />

      {/* 2. Di Tengah: Tabel bergaris mewah berisi tanggal, motor, tahun, nopol, hari (otomatis hitung) */}
      <main id="main-content" className="flex-1 min-h-0 flex flex-col w-full overflow-hidden relative">
        <MotorTable
          data={motorData}
          activeRole={activeRole}
          isLoading={!isDataLoaded}
          onOpenPortalDoors={() => setActiveModal('portal_doors')}
          onStartEditMotor={handleStartEditFromTable}
          onDeleteMotor={handleDeleteMotor}
        />
      </main>

      {/* 3. Footer: Hanya bertuliskan support by ghighais development (tetap di bawah / tidak bergerak) */}
      <Footer />

      {/* Single Door Triggered Modal: Login Halaman DRU dan PECEL */}
      <PortalAccessModal
        isOpen={activeModal === 'portal_doors'}
        onClose={() => setActiveModal('none')}
        onLoginDruSuccess={handleDruLoginSuccess}
        onLoginPecelSuccess={handlePecelLoginSuccess}
      />

      {/* DRU 3 Dashboards Panel (MOTOR PECEL, MOTOR MAMAH, PRIBADI, Input, Logo) */}
      <DruModal
        isOpen={activeModal === 'dru_panel'}
        onClose={() => {
          setActiveModal('none');
          setEditingMotorId(null);
        }}
        onLogout={handleLogout}
        config={config}
        onUpdateLogo={handleUpdateLogo}
        motorData={motorData}
        onAddMotor={handleAddMotor}
        onUpdateMotor={handleUpdateMotor}
        onDeleteMotor={handleDeleteMotor}
        onResetMotorData={handleResetMotorData}
        onToggleLunas={handleToggleLunas}
        onSendPemasukanToPecel={handleSendPemasukanToPecel}
        initialEditingId={editingMotorId}
      />

      {/* PECEL Panel (Verifikasi Motor Pecel, Konfirmasi Pemasukan Otomatis ke DRU) */}
      <PecelPanel
        isOpen={activeModal === 'pecel_panel'}
        onClose={() => setActiveModal('none')}
        onLogout={handleLogout}
        motorData={motorData}
        onConfirmPemasukan={handleConfirmPemasukanPecel}
        onCancelConfirmPemasukan={handleCancelConfirmPemasukanPecel}
        onToggleLunas={handleToggleLunas}
      />
    </div>
  );
}
