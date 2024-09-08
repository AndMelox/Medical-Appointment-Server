const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const filePath = 'citas.json';
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Leer datos desde el archivo JSON
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

// Escribir datos en el archivo JSON
function writeDataToFile(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Datos escritos en el archivo:', data);
  } catch (error) {
    console.error('Error al escribir en el archivo JSON:', error.message);
  }
}

app.post('/save', upload.single('document'), (req, res) => {
    console.log('Solicitud POST recibida para guardar datos:', req.body);
  
    const dataArray = Array.isArray(req.body) ? req.body : [req.body];
  
    for (const item of dataArray) {
      if (typeof item.id === 'undefined' || typeof item.arrivalTime === 'undefined') {
        console.warn('Solicitud incorrecta. Cada objeto debe tener un ID y una fecha programada.');
        return res.status(400).send('Cada objeto debe tener un ID y una fecha programada.');
      }
    }
  
    let existingData = readDataFromFile();
  
    for (const data of dataArray) {
      const existingItem = existingData.find(item => item.id === data.id);
      if (existingItem) {
        console.warn(`El ID ${data.id} ya existe.`);
        return res.status(400).send(`La CC ${data.id} ya existe. Intenta con otro ID.`);
      }
  
      const sameTimeItem = existingData.find(item => item.arrivalTime === data.arrivalTime);
      if (sameTimeItem) {
        console.warn(`Ya existe una cita a la misma hora y el mismo día: ${data.arrivalTime}.`);
        return res.status(400).send(`Ya existe una cita a la misma hora y el mismo día: ${data.arrivalTime}.`);
      }
    }
  
    for (const data of dataArray) {
      const arrivalTime = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
      const newData = { 
        ...data, 
        arrivalTime: arrivalTime,
        image: req.file ? req.file.filename : null // Guardar el nombre del archivo de imagen
      };
      existingData.push(newData);
    }
  
    writeDataToFile(existingData);
    console.log('Datos guardados correctamente.');
    res.send('Datos guardados correctamente.');
  });
  

// Endpoint para obtener citas en un rango de fechas
app.get('/citas', (req, res) => {
    const { startDate, endDate } = req.query;
  
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
  
    if (!startDate || !endDate) {
      return res.status(400).send('Debe proporcionar startDate y endDate en la consulta.');
    }
  
    const start = new Date(startDate.split('T')[0]);
    const end = new Date(endDate.split('T')[0]);
    end.setUTCDate(end.getUTCDate() + 1); // Incluir todo el día de endDate
  
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
  
    // Añadir URL completa de la imagen a cada cita
    const citasConImagen = filteredCitas.map(cita => ({
      ...cita,
      imageUrl: cita.image ? `http://localhost:3000/uploads/${cita.image}` : null
    }));
  
    res.json(citasConImagen);
  });
  

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
