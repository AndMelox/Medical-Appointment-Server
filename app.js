const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
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

app.post('/upload', upload.single('image'), (req, res) => {
  const imagePath = req.file.path;
  res.json({ imagePath });
});

app.post('/citas', (req, res) => {
  const { documento, nombre, fecha, hora, imagePath } = req.body;

  fs.readFile('citas.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al leer el archivo');
    }

    const citas = JSON.parse(data);
    citas.push({ documento, nombre, fecha, hora, imagePath });

    fs.writeFile('citas.json', JSON.stringify(citas, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error al guardar la cita');
      }

      res.status(201).send('Cita guardada');
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
