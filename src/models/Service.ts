import { Pool } from "pg";
import pool from "../config/database";

export interface IService {
  id?: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  duration_minutes: number;
  price?: number;
  color?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class Service {
  constructor(public pool: Pool) { }

  /**
   * Get all active services
   */
  async getAll(): Promise<IService[]> {
    const result = await this.pool.query(
      `SELECT 
        id,
        name,
        name_ar,
        description,
        description_ar,
        duration_minutes,
        price,
        color,
        is_active,
        created_at,
        updated_at
      FROM services
      WHERE is_active = true
      ORDER BY name`
    );
    return result.rows;
  }

  /**
   * Get service by ID
   */
  async getById(id: string): Promise<IService | null> {
    const result = await this.pool.query(
      `SELECT 
        id,
        name,
        name_ar,
        description,
        description_ar,
        duration_minutes,
        price,
        color,
        is_active,
        created_at,
        updated_at
      FROM services
      WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new service
   */
  async create(service: IService): Promise<IService> {
    const result = await this.pool.query(
      `INSERT INTO services (
        name,
        name_ar,
        description,
        description_ar,
        duration_minutes,
        price,
        color,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        service.name,
        service.name_ar || null,
        service.description || null,
        service.description_ar || null,
        service.duration_minutes,
        service.price || null,
        service.color || '#1976d2',
        service.is_active !== undefined ? service.is_active : true
      ]
    );
    return result.rows[0];
  }

  /**
   * Update an existing service
   */
  async update(id: string, service: Partial<IService>): Promise<IService | null> {
    const result = await this.pool.query(
      `UPDATE services
      SET 
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        description = COALESCE($3, description),
        description_ar = COALESCE($4, description_ar),
        duration_minutes = COALESCE($5, duration_minutes),
        price = COALESCE($6, price),
        color = COALESCE($7, color),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [
        service.name || null,
        service.name_ar || null,
        service.description || null,
        service.description_ar || null,
        service.duration_minutes || null,
        service.price || null,
        service.color || null,
        service.is_active !== undefined ? service.is_active : null,
        id
      ]
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete a service (set is_active to false)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE services
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [id]
    );
    return result.rowCount! > 0;
  }
}

export default new Service(pool);
