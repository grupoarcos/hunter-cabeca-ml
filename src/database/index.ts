import { MongoClient, Collection, Db } from "mongodb";
import type { Config } from "../config/index.js";

export interface LojaDocument {
  _id?: string;
  numero: number;
  produto_origem: string;
  categoria: string;
  nome_loja: string;
  link_loja: string;
  vendas_estimadas: number;
  mercado_lider: boolean;
  reputacao_verde: boolean;
  localizacao: string | null;
  score_brasil: number;
  plataforma: string;
  data_extracao: Date;
  created_at: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection<LojaDocument> | null = null;

// ========== CONECTAR ==========
export async function connectDatabase(config: Config): Promise<void> {
  try {
    client = new MongoClient(config.mongo.uri);
    await client.connect();

    db = client.db(config.mongo.database);
    collection = db.collection<LojaDocument>(config.mongo.collection);

    // Cria índices
    await collection.createIndex({ nome_loja: 1 }, { unique: false });
    await collection.createIndex({ link_loja: 1 }, { unique: true });
    await collection.createIndex({ categoria: 1 });
    await collection.createIndex({ data_extracao: -1 });

    console.log(
      `✅ MongoDB conectado: ${config.mongo.database}/${config.mongo.collection}`
    );
  } catch (error) {
    console.error("❌ Erro ao conectar MongoDB:", error);
    throw error;
  }
}

// ========== DESCONECTAR ==========
export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collection = null;
    console.log("🔌 MongoDB desconectado");
  }
}

// ========== SALVAR LOJA ==========
export async function saveLoja(
  loja: Omit<LojaDocument, "_id" | "created_at">
): Promise<boolean> {
  if (!collection) {
    console.error("❌ MongoDB não conectado");
    return false;
  }

  try {
    const document: LojaDocument = {
      ...loja,
      created_at: new Date(),
    };

    await collection.updateOne(
      { link_loja: loja.link_loja },
      { $set: document },
      { upsert: true }
    );

    return true;
  } catch (error) {
    // Ignora erro de duplicata
    if ((error as any)?.code === 11000) {
      return false;
    }
    console.error("❌ Erro ao salvar loja:", error);
    return false;
  }
}

// ========== VERIFICAR SE EXISTE ==========
export async function lojaExists(linkLoja: string): Promise<boolean> {
  if (!collection) return false;

  try {
    const count = await collection.countDocuments({ link_loja: linkLoja });
    return count > 0;
  } catch (error) {
    return false;
  }
}

// ========== CONTAR LOJAS ==========
export async function countLojas(categoria?: string): Promise<number> {
  if (!collection) return 0;

  try {
    const filter = categoria ? { categoria } : {};
    return await collection.countDocuments(filter);
  } catch (error) {
    return 0;
  }
}

// ========== BUSCAR LOJAS ==========
export async function getLojas(
  filter: Partial<LojaDocument> = {},
  limit: number = 100
): Promise<LojaDocument[]> {
  if (!collection) return [];

  try {
    return await collection
      .find(filter)
      .sort({ data_extracao: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error("❌ Erro ao buscar lojas:", error);
    return [];
  }
}

// ========== ESTATÍSTICAS ==========
export async function getStats(): Promise<{
  total: number;
  porCategoria: Record<string, number>;
  mercadoLideres: number;
}> {
  if (!collection) {
    return { total: 0, porCategoria: {}, mercadoLideres: 0 };
  }

  try {
    const total = await collection.countDocuments();
    const mercadoLideres = await collection.countDocuments({
      mercado_lider: true,
    });

    const categorias = await collection
      .aggregate([{ $group: { _id: "$categoria", count: { $sum: 1 } } }])
      .toArray();

    const porCategoria: Record<string, number> = {};
    for (const cat of categorias) {
      porCategoria[cat._id] = cat.count;
    }

    return { total, porCategoria, mercadoLideres };
  } catch (error) {
    return { total: 0, porCategoria: {}, mercadoLideres: 0 };
  }
}
