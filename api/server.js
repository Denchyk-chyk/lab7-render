const express = require("express");
const { Pool } = require("pg");
const Joi = require("joi");
require("dotenv").config();
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

// Налаштування підключення до PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "my_database",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

// Схема валідації за допомогою Joi
const userSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    "string.min": "Ім’я має містити мінімум 2 символи",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Введіть коректну адресу email",
  }),
  age: Joi.number().integer().min(1).max(120).required(),
  comment: Joi.string().allow("", null).max(500),
});

// 0. GET: Перевірка стану сервера
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 1. POST: Збереження користувача
app.post("/api/users", async (req, res) => {
  // Валідація вхідних даних
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, age, comment } = value;

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, age, comment) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, age, comment],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // Код помилки для Duplicate Key (email)
      return res.status(400).json({ error: "Цей email вже зареєстровано" });
    }
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// 2. GET: Отримання списку користувачів
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер запущено на порту ${PORT}`));
