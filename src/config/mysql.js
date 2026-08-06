import mysql from 'mysql2/promise';
import { config } from './env.js';

export let pool = null;

export async function connectMySQL() {
  try {
    // 1. First establish a raw connection to check/create the database itself
    try {
      const conn = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password
      });
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``);
      await conn.end();
    } catch (err) {
      console.warn(`[MySQL] Warning trying to auto-create database "${config.mysql.database}":`, err.message);
    }

    // 2. Initialize the connection pool
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test a connection from the pool
    const connection = await pool.getConnection();
    console.log(`[Database] MySQL connected successfully to ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);

    // 3. Create the users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT NOT NULL,
        mob VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        img TEXT NOT NULL,
        agency_id VARCHAR(20) NOT NULL,
        agency_unq_id VARCHAR(20) NOT NULL,
        read_status VARCHAR(20) NOT NULL,
        verification VARCHAR(10) NOT NULL,
        type VARCHAR(100) NOT NULL,
        show_status VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        time VARCHAR(100) NOT NULL
      )
    `);

    connection.release();
  } catch (error) {
    console.error(`[Database] Failed to connect to MySQL at ${config.mysql.host}:`, error.message);
    throw error;
  }
}

export async function disconnectMySQL() {
  if (pool) {
    await pool.end();
    console.log('[Database] MySQL pool disconnected');
  }
}
