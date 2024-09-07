const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const filePath = "citas.json";
const port = 3000;

let appointmentCounter = 0;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

app.use(express.json());

function readDataFromFile() {
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const data = fileContent.trim() ? JSON.parse(fileContent) : [];
      console.log("Datos leídos del archivo:", data);
      return data;
    } catch (error) {
      console.error("Error al leer el archivo JSON:", error.message);
      return [];
    }
  } else {
    console.warn("El archivo JSON no existe.");
    return [];
  }
}
function generateUniqueId(cc) {
  const timestamp = Date.now();
  return `${cc}-${timestamp}`;
}
function writeDataToFile(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log("Datos escritos en el archivo:", data);
  } catch (error) {
    console.error("Error al escribir en el archivo JSON:", error.message);
  }
}

app.post("/create", upload.single("authorization"), (req, res) => {
  const { cc, arrivalTime } = req.body;
  const authorization = req.file;

  if (!cc || !arrivalTime || !authorization) {
    return res
      .status(400)
      .send("Faltan datos requeridos (cc, arrivalTime, authorization).");
  }

  if (!/^\d{10}$/.test(cc)) {
    return res.status(400).send("La cédula debe tener 10 dígitos.");
  }

  let existingData = readDataFromFile();

  const sameTimeAppointment = existingData.find(
    (appointment) => appointment.arrivalTime === arrivalTime
  );
  if (sameTimeAppointment) {
    return res
      .status(400)
      .send("Ya existe una cita a la misma hora y el mismo día.");
  }

  const newAppointment = {
    id: generateUniqueId(cc),
    cc,
    arrivalTime,
    authorization: authorization.filename,
    status: "active",
  };

  existingData.push(newAppointment);
  writeDataToFile(existingData);
  res.json({
    message: "Cita creada correctamente.",
    appointmentId: newAppointment.id,
  });
});

app.delete("/cancel/:id", (req, res) => {
  const id = req.params.id;
  let existingData = readDataFromFile();
  const appointment = existingData.find((appointment) => appointment.id === id);

  if (!appointment) {
    return res
      .status(404)
      .send("No se encontró una cita con el ID proporcionado.");
  }

  appointment.status = "cancelled";
  writeDataToFile(existingData);
  res.json({
    message: "Cita cancelada correctamente.",
    appointmentId: appointment.id,
  });
});

app.get("/", (req, res) => {
  res.send("¡Hola, mundo!");
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
