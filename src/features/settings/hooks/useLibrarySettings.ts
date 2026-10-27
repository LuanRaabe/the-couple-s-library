import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { LibrarySettings } from '../types';
import { getSettingsCollection } from '../../../utils/envHelper';

const DEFAULT_SETTINGS: LibrarySettings = {
  eleName: 'Luan',
  elaName: 'Theresa',
  yearlyGoal: 40,
};

export function useLibrarySettings(currentUser: FirebaseUser | null, onNotify?: (msg: string) => void) {
  const [settings, setSettings] = useState<LibrarySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!currentUser) return;

    const settingsDocPath = getSettingsCollection();
    const settingsDocRef = doc(db, settingsDocPath, 'couple');

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LibrarySettings;
          setSettings({
            eleName: data.eleName || 'Luan',
            elaName: data.elaName || 'Theresa',
            yearlyGoal: data.yearlyGoal || 40,
          });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, `${settingsDocPath}/couple`);
        } catch (e) {
          console.warn('Firestore settings snapshot listener caught:', e);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const saveSettings = async (newSettings: LibrarySettings) => {
    setSettings(newSettings);

    if (!currentUser) {
      if (onNotify) onNotify('Configurações salvas localmente. Entre com o Google para sincronizar com seu parceiro.');
      return;
    }

    const settingsCollection = getSettingsCollection();
    const path = `${settingsCollection}/couple`;
    try {
      await setDoc(doc(db, settingsCollection, 'couple'), {
        ...newSettings,
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (onNotify) onNotify('Configurações do casal salvas com sucesso no banco!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return {
    settings,
    setSettings,
    saveSettings,
  };
}
