import AsyncStorage from '@react-native-async-storage/async-storage';

let lastWrite: Promise<void> = Promise.resolve();
let lastWriteError: unknown;

export const storage = {
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      lastWrite = AsyncStorage.setItem(name, value);
      lastWriteError = undefined;
    } catch (error) {
      lastWrite = Promise.resolve();
      lastWriteError = error;
    }
    // Zustand does not await storage writes; keep failures observable through
    // waitForLastWrite while returning a handled promise to its middleware.
    return lastWrite.catch(() => undefined);
  },
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

export const waitForLastWrite = async (): Promise<void> => {
  await lastWrite;
  if (lastWriteError) throw lastWriteError;
};
