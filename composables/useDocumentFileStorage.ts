const dbName = 'dokumo-file-storage'
const storeName = 'files'
const dbVersion = 1

function openFileDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(dbName, dbVersion)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function fileTransaction(mode: IDBTransactionMode) {
  const db = await openFileDb()
  const transaction = db.transaction(storeName, mode)
  const store = transaction.objectStore(storeName)
  return { db, transaction, store }
}

export async function saveDocumentFile(key: string, dataUrl?: string) {
  if (!import.meta.client || !dataUrl) return
  const { db, transaction, store } = await fileTransaction('readwrite')
  await new Promise<void>((resolve, reject) => {
    const request = store.put(dataUrl, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function getDocumentFile(key?: string) {
  if (!import.meta.client || !key) return ''
  const { db, transaction, store } = await fileTransaction('readonly')
  const value = await new Promise<string>((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : '')
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
  return value
}

export async function deleteDocumentFile(key?: string) {
  if (!import.meta.client || !key) return
  const { db, transaction, store } = await fileTransaction('readwrite')
  await new Promise<void>((resolve, reject) => {
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function clearDocumentFiles() {
  if (!import.meta.client) return
  const { db, transaction, store } = await fileTransaction('readwrite')
  await new Promise<void>((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}
