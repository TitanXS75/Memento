import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'
import type { MementoDB } from './schema'
import { DB_NAME, DB_VERSION } from './schema'
import { runMigrations } from './migrations'

let dbInstance: IDBPDatabase<MementoDB> | null = null

export async function getDb(): Promise<IDBPDatabase<MementoDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<MementoDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      runMigrations(db, oldVersion)
    },
    blocked() {
      console.warn('[memento/db] upgrade blocked — close other tabs')
    },
    blocking() {
      // Another tab wants to upgrade — release the connection
      dbInstance?.close()
      dbInstance = null
    },
    terminated() {
      dbInstance = null
    },
  })

  return dbInstance
}

/** Close the DB connection (useful in tests). */
export function closeDb(): void {
  dbInstance?.close()
  dbInstance = null
}
