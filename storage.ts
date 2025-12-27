// Minimal TypeScript helpers for storage (Day 1 placeholder)
export async function getStorage<T = any>(
  keys: string | string[] | null
): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (res) => resolve(res as unknown as T));
  });
}

export async function setStorage(items: object): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}
