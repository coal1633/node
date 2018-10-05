 const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")

db.run("PRAGMA foreign_keys = ON")

db.run(`
  CREATE TABLE IF NOT EXISTS Company (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name VARCHAR(20) UNIQUE,
		hashedPassword VARCHAR(15),
		location TEXT
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS User (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username VARCHAR(20) UNIQUE,
		hashedPassword VARCHAR(15)
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Advert (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company_id INTEGER,
		title TEXT,
		sector VARCHAR(30),
		type TEXT,
		description TEXT,
		location VARCHAR(50),
		FOREIGN KEY(\`company_id\`) REFERENCES \`Company\`(\`id\`) ON DELETE CASCADE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Skill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_name VARCHAR(20) UNIQUE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS UserSkill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_id INTEGER,
		user_id INTEGER,
		FOREIGN KEY(\`skill_id\`) REFERENCES \`Skill\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`user_id\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE
	)
`)
db.run(`
  CREATE TABLE IF NOT EXISTS AdvertSkill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_id INTEGER,
		advert_id INTEGER,
		FOREIGN KEY(\`skill_id\`) REFERENCES \`Skill\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`advert_id\`) REFERENCES \`Advert\`(\`id\`) ON DELETE CASCADE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Application(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		company_id INTEGER,
		advert_id INTEGER,
		FOREIGN KEY(\`user_id\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`company_id\`) REFERENCES \`Company\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`advert_id\`) REFERENCES \`Advert\`(\`id\`) ON DELETE CASCADE
	)
`)