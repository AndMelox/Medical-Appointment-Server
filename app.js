const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const filePath = "citas.json";
const port = 3000;
const cors = require('cors');

app.use(cors());


let nextId = 1; 

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function readDataFromFile() {
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = fileContent.trim() ? JSON.parse(fileContent) : [];
      console.log('Datos leídos del archivo:', data);
      return data;
    } catch (error) {
      console.error('Error al leer el archivo JSON:', error.message);
      return [];
    }
  } else {
    console.warn('El archivo JSON no existe.');
    return [];
  }
}

function writeDataToFile(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Datos escritos en el archivo:', data);
  } catch (error) {
    console.error('Error al escribir en el archivo JSON:', error.message);
  }
}

function getNextId(existingData) {
  return existingData.length > 0 ? Math.max(...existingData.map(d => d.id)) + 1 : 1;
}

app.post('/save', upload.single('image'), (req, res) => {
  console.log('Solicitud POST recibida para guardar datos:', req.body);

  const dataArray = Array.isArray(req.body) ? req.body : [req.body];

  for (const item of dataArray) {
    if (typeof item.arrivalTime === 'undefined') {
      console.warn('Solicitud incorrecta. Cada objeto debe tener una fecha programada.');
      return res.status(400).json({ message: 'Cada objeto debe tener una fecha programada.' });
    }

    if (!/^\d{10}$/.test(item.cedula)) {
      console.warn('La cédula debe tener 10 dígitos.');
      return res.status(400).json({ message: 'La cédula debe tener 10 dígitos.' });
    }
  }

  let existingData = readDataFromFile();

  for (const data of dataArray) {
    const sameTimeItem = existingData.find(item => item.arrivalTime === data.arrivalTime);
    if (sameTimeItem) {
      console.warn(`Ya existe una cita a la misma hora y el mismo día: ${data.arrivalTime}.`);
      return res.status(400).json({ message: `Ya existe una cita a la misma hora y el mismo día: ${data.arrivalTime}.` });
    }
  }

  const newDataArray = dataArray.map(data => ({
    ...data,
    id: getNextId(existingData), 
    status: 'active',
    image: req.file ? req.file.filename : null
  }));

  existingData = existingData.concat(newDataArray);
  writeDataToFile(existingData);
  console.log('Datos guardados correctamente.');
  res.status(200).json({ message: 'Datos guardados correctamente.' });
});

app.get('/citas', (req, res) => {
  const { startDate, endDate } = req.query;

  console.log('startDate:', startDate);
  console.log('endDate:', endDate);

  if (!startDate || !endDate) {
    return res.status(400).send('Debe proporcionar startDate y endDate en la consulta.');
  }

  const start = new Date(startDate.split('T')[0]);
  const end = new Date(endDate.split('T')[0]);
  end.setUTCDate(end.getUTCDate() + 1);

  console.log('start:', start);
  console.log('end:', end);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Fechas inválidas:', { start, end });
    return res.status(400).send('Las fechas proporcionadas no son válidas. Asegúrate de usar el formato ISO 8601.');
  }

  const existingData = readDataFromFile();

  console.log('Datos existentes:', existingData);

  const filteredCitas = existingData.filter(cita => {
    const citaDate = new Date(cita.arrivalTime.split('T')[0]);
    console.log('citaDate:', citaDate);
    return citaDate >= start && citaDate < end;
  });

  console.log('filteredCitas:', filteredCitas);

  const citasConImagen = filteredCitas.map(cita => ({
    ...cita,
    imageUrl: cita.image ? `http://localhost:3000/uploads/${cita.image}` : null
  }));

  res.json(citasConImagen);
});

app.patch('/cancel/:id', (req, res) => {
  const id = parseInt(req.params.id, 10); 
  let existingData = readDataFromFile();

  console.log('ID recibido para cancelar:', id); 

  const appointment = existingData.find((appointment) => appointment.id === id);

  if (!appointment) {
    console.log('No se encontró una cita con el ID:', id); 
    return res.status(404).send('No se encontró una cita con el ID proporcionado.');
  }

  appointment.status = 'cancelled';
  writeDataToFile(existingData);
  res.json({ message: 'Cita cancelada correctamente.', appointmentId: appointment.id });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
