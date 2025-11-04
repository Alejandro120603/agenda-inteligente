const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "..", "data", "app.db");

const credentials = [
  { correo: "daniel@correo.com", password: "dan123" },
  { correo: "adrian@correo.com", password: "chuy123" },
];

if (!fs.existsSync(dbPath)) {
  console.error(`[verify-passwords] No se encontró la base de datos en ${dbPath}`);
  process.exitCode = 1;
  process.exit();
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("[verify-passwords] Error al abrir la base de datos:", err.message);
    process.exit(1);
  }
});

db.serialize(async () => {
  try {
    for (const cred of credentials) {
      const row = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id, nombre, correo, password_hash FROM usuarios WHERE correo = ?",
          [cred.correo],
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      if (!row) {
        console.error(`❌ Usuario no encontrado: ${cred.correo}`);
        continue;
      }

      const isValid = await bcrypt.compare(cred.password, row.password_hash);
      if (isValid) {
        console.log(`✅ Hash válido para ${cred.correo}`);
      } else {
        console.error(`❌ Hash inválido para ${cred.correo}`);
      }
    }
  } catch (error) {
    console.error("[verify-passwords] Error durante la validación:", error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
});
