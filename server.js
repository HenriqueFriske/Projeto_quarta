var express = require("express");
var path = require("path");
var crypto = require("crypto");
var fs = require("fs");
var moment = require("moment");

var app = express();
var port = 3000;

var data = {
  humidity: 10,
  temperature: 0,
  date: new Date(),
  airConditioning: false,
  humidifier: false,
  encryptedText: "",
};

var key = new Buffer("unijuiunijuiunij", "utf-8"); // Chave de 16 bytes
var iv = new Buffer("abcdefghijklmnop", "utf-8"); // IV de 16 bytes (usado no Python)

moment.locale("pt-br");
app.use(express.json());

var databasePath = path.join(__dirname, "database.json");

// Função para garantir que o arquivo exista
function ensureDatabase() {
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify([]));
  }
}

// Função para obter o conteúdo do banco de dados
function getDatabase() {
  ensureDatabase();
  var content = fs.readFileSync(databasePath, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e) {
    // Corrigir automaticamente caso o JSON esteja inválido
    fs.writeFileSync(databasePath, JSON.stringify([]));
    return [];
  }
}

// Função para adicionar dados ao banco de dados
function addDatabase(entry) {
  var database = getDatabase();
  database.push(entry);
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2)); // Formatar o JSON para leitura mais fácil
  return database;
}

// Função para descriptografar dados
function decryptAES(encryptedData) {
  var encryptedBuffer = new Buffer(encryptedData, "base64");
  var decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  var decrypted = decipher.update(encryptedBuffer, undefined, "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

// Rota para obter status
app.get("/status", function (req, res) {
  var list = getDatabase();
  var _date = moment(data.date).add(-3, "h");
  res.status(200).json({
    airConditioning: data.airConditioning,
    encryptedText: data.encryptedText,
    humidifier: data.humidifier,
    humidity: data.humidity,
    temperature: data.temperature,
    date: _date.format("L") + " " + _date.format("LTS"),
    list: list,
  });
});

// Rota para atualizar status
app.post("/status", function (req, res) {
  try {
    var encrypted = req.body.encrypted;
    if (!encrypted || encrypted.length === 0) return res.status(400).send("Invalid data");

    var json = decryptAES(encrypted);
    var parsed = JSON.parse(json);
    var _data = { humidity: parsed.humidity, temperature: parsed.temperature, date: new Date() };
    var list = addDatabase(_data);

    console.log("Dados criptografados recebidos:", encrypted);
    console.log("Dados Descriptografados:", parsed)

    data = {
      humidity: parsed.humidity,
      temperature: parsed.temperature,
      date: new Date(),
      encryptedText: encrypted,
      airConditioning: parsed.temperature > 25,
      humidifier: parsed.humidity < 60,
      list: list,
    };

    dataRES = {
      airConditioning: data.airConditioning,
      humidifier: data.humidifier,
      message: "Status atualizado com sucesso",  // Mensagem simples sem os dados do sensor
    };
    res.status(200).json(dataRES);
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).send("Error processing request");
  }
});

// Rota para página inicial
app.get("/", function (_, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Inicialização do servidor
app.listen(port, function () {
  console.log("Servidor rodando na porta " + port);
  ensureDatabase(); // Garantir que o arquivo exista
});