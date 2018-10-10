const express = require('express')
const app = express()
const bodyParser = require('body-parser')
require('body-parser-xml')(bodyParser)
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")

var adverts = require('./adverts')
app.use('/', adverts)
var accounts = require('./accounts')
app.use('/', accounts)
var userSkills = require('./user-skills')
app.use('/', userSkills)
var advertSkills = require('./advert-skills')
app.use('/', advertSkills)
var application = require('./applications')
app.use('/', application)
var skillAdvanced= require('./skill-advanced')
app.use('/', skillAdvanced)
var userAdvanced= require('./user-advanced')
app.use('/', userAdvanced)
var companyAdvanced = require('./company-advanced')
app.use('/', companyAdvanced)
var applicationAdvanced= require('./application-advanced')
app.use('/', applicationAdvanced)

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(bodyParser.xml({
  limit: '1MB',   
  xmlParseOptions: {
    normalize: true,     
    normalizeTags: true, 
    explicitArray: false 
  }
}))

app.use(function(req, res, next){
	let contentType = req.headers['content-type'];
	if(contentType=="application/xml"){
		req.body = req.body[Object.keys(req.body)[0]]
	}
	next()
})

app.use(bodyParser.urlencoded({extended: false}))

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
		hashedPassword VARCHAR(15),
		google_id INTEGER UNIQUE
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

app.listen(3000)
