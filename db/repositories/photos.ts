// db/repositories/photos.ts
// Única capa que conoce Drizzle para la tabla photos.
import { and, asc, desc, eq, gt, isNotNull, isNull, like, or, type SQL } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '@/db/client';
import { albums, photos, type NewPhoto } from '@/db/schema';

/** Lo que el asistente sabe de cada foto. Nunca la imagen. */
export interface FotoContexto {
  fecha: string;
  nota: string | null;
  descripcion: string | null;
  lat: number | null;
  lng: number | null;
  favorita: boolean;
  album: string | null;
}

const redondear = (n: number | null) => (n == null ? null : Math.round(n * 1e4) / 1e4);

type PhotoInput = Omit<NewPhoto, 'id' | 'createdAt'>;
export type PhotoChanges = Partial<Pick<NewPhoto, 'note' | 'favorite' | 'albumId'>>;

/** Filtro de álbum: null = todos, 'none' = sin álbum, número = ese álbum. */
export type AlbumFilter = number | 'none' | null;

export interface PhotoFilters {
  search: string;
  albumId: AlbumFilter;
  onlyFavorites: boolean;
}

export const photosRepo = {
  listQuery() {
    return db.select().from(photos).orderBy(desc(photos.createdAt));
  },

  withLocationQuery() {
    return db
      .select()
      .from(photos)
      .where(and(isNotNull(photos.latitude), isNotNull(photos.longitude)))
      .orderBy(desc(photos.createdAt));
  },

  withoutLocationQuery() {
    return db.select().from(photos).where(isNull(photos.latitude)).orderBy(desc(photos.createdAt));
  },

  /** C4: búsqueda por nota (LIKE) + filtros por álbum y favoritas. */
  searchQuery({ search, albumId, onlyFavorites }: PhotoFilters) {
    const conditions: SQL[] = [];
    const term = search.trim();
    if (term) conditions.push(like(photos.note, `%${term}%`));
    if (albumId === 'none') conditions.push(isNull(photos.albumId));
    else if (albumId !== null) conditions.push(eq(photos.albumId, albumId));
    if (onlyFavorites) conditions.push(eq(photos.favorite, true));

    return db
      .select()
      .from(photos)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(photos.createdAt));
  },

  /** Una sola foto, reactiva (para la pantalla de detalle). */
  byIdQuery(id: number) {
    return db.select().from(photos).where(eq(photos.id, id)).limit(1);
  },

  async findById(id: number) {
    return await db.select().from(photos).where(eq(photos.id, id)).get();
  },

  async allUris() {
    const rows = await db.select({ uri: photos.uri }).from(photos);
    return rows.map((r) => r.uri);
  },

  async create(data: PhotoInput) {
    await db.insert(photos).values(data);
  },

  /** Edición hecha por el usuario: siempre actualiza updatedAt (la foto queda pendiente de subir). */
  async update(id: number, changes: PhotoChanges) {
    await db.update(photos).set({ ...changes, updatedAt: new Date() }).where(eq(photos.id, id));
  },

  /**
   * Semana 10 (T5): guarda la descripción de IA (ya revisada por el usuario).
   * Cambia updatedAt: sin eso la foto no queda pendiente y la descripción nunca se sube.
   */
  async setDescription(id: number, aiDescription: string | null) {
    await db.update(photos).set({ aiDescription, updatedAt: new Date() }).where(eq(photos.id, id));
  },

  // ---------- Semana 9: soporte para la sincronización ----------

  /** Fotos pendientes de subir: nunca sincronizadas, o editadas después de la última subida. */
  pendingQuery() {
    return db
      .select()
      .from(photos)
      .where(or(isNull(photos.syncedAt), gt(photos.updatedAt, photos.syncedAt)))
      .orderBy(asc(photos.createdAt));
  },

  async listPending() {
    return await photosRepo.pendingQuery();
  },

  async findByClientId(clientId: string) {
    return await db.select().from(photos).where(eq(photos.clientId, clientId)).get();
  },

  /** Foto que llegó de la nube: se inserta ya sincronizada. */
  async insertFromRemote(data: NewPhoto) {
    await db.insert(photos).values(data);
  },

  /** Aplica en local una versión más nueva de la nube. Nunca usa la hora actual. */
  async applyRemote(
    id: number,
    changes: {
      note: string | null;
      favorite: boolean;
      aiDescription: string | null;
      updatedAt: Date;
      syncedAt: Date;
    }
  ) {
    await db.update(photos).set(changes).where(eq(photos.id, id));
  },

  /** Marca la foto como subida. syncedAt es la versión (updatedAt) que se subió, no "ahora". */
  async markSynced(id: number, remotePath: string, syncedAt: Date) {
    await db.update(photos).set({ remotePath, syncedAt }).where(eq(photos.id, id));
  },

  /** Semana 8: rellena clientId y updatedAt en las fotos anteriores a la migración. */
  async ensureSyncFields() {
    const rows = await db.select().from(photos).where(isNull(photos.clientId));
    for (const row of rows) {
      await db
        .update(photos)
        .set({ clientId: Crypto.randomUUID(), updatedAt: row.updatedAt ?? row.createdAt })
        .where(eq(photos.id, row.id));
    }
  },

  /** Asistente IA: resumen de las fotos más recientes (sin imágenes) para enviar con cada pregunta. */
  async contextoAsistente(limite = 60): Promise<FotoContexto[]> {
    const rows = await db
      .select({
        createdAt: photos.createdAt,
        note: photos.note,
        aiDescription: photos.aiDescription,
        latitude: photos.latitude,
        longitude: photos.longitude,
        favorite: photos.favorite,
        album: albums.name,
      })
      .from(photos)
      .leftJoin(albums, eq(photos.albumId, albums.id))
      .orderBy(desc(photos.createdAt))
      .limit(limite);
    return rows.map((r) => ({
      fecha: r.createdAt.toISOString(),
      nota: r.note?.slice(0, 300) ?? null,
      descripcion: r.aiDescription?.slice(0, 400) ?? null,
      lat: redondear(r.latitude), // ~10 m: suficiente para decir el lugar
      lng: redondear(r.longitude),
      favorita: r.favorite,
      album: r.album ?? null,
    }));
  },

  async remove(id: number) {
    await db.delete(photos).where(eq(photos.id, id));
  },

  async clearAll() {
    await db.delete(photos);
  },
};
