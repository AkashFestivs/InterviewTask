const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const OpenAI = require('openai');

// Initialize the app
const app = express();
const port = 3000;
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './app/views'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './app/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route: Render the upload form
app.get('/', (req, res) => {
  res.render('form', { extractedData: null });
});

// Route: Handle form upload and extract text
app.post('/upload-new', upload.single('image'), async function (req, res) {
  const filePath = req.file.path;

  console.log(`Starting OCR on file: ${filePath}`);
  const result = await Tesseract.recognize(filePath, 'eng');

  // Log the raw text output
  const text = result.data.text;
  console.log("Extracted Text:\n", text);

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `Extract details from the given image extracted text.
                  Instructions:
                  Full Name, Date of Birth (MM/DD/YYYY), Nationality, Identification Number, Address, City, Pincode/Zip, Country, Issue Date.
                  If not found, return an empty string.
                  Output should be in JSON format.
                  this is the text: ${text}`
      }
    ],
  });

  console.log("response>>>", response.choices[0].message);

  // Extracted data from OpenAI response
  // Remove markdown formatting (```json ...```) and parse the JSON data
  const rawData = response.choices[0].message.content;
  const jsonString = rawData.replace(/^```json\n|\n```$/, ''); // Removes ```json\n and \n```
  console.log("jsonString>>>>", jsonString)

  try {
      const extractedData = JSON.parse(jsonString);
      
      // Return an HTML response
      const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Extracted Data</title>
        </head>
        <body>
          <h1>Extracted Data from the Image</h1>
          <ul>
            <li><strong>Full Name:</strong> ${extractedData["Full Name"] || 'N/A'}</li>
            <li><strong>Date of Birth:</strong> ${extractedData["Date of Birth"] || 'N/A'}</li>
            <li><strong>Nationality:</strong> ${extractedData["Nationality"] || 'N/A'}</li>
            <li><strong>Identification Number:</strong> ${extractedData["Identification Number"] || 'N/A'}</li>
            <li><strong>Address:</strong> ${extractedData["Address"] || 'N/A'}</li>
            <li><strong>City:</strong> ${extractedData["City"] || 'N/A'}</li>
            <li><strong>Pincode/Zip:</strong> ${extractedData["Pincode/Zip"] || 'N/A'}</li>
            <li><strong>Country:</strong> ${extractedData["Country"] || 'N/A'}</li>
            <li><strong>Full Text: </strong> ${jsonString}</li>
          </ul>
          <a href="/">Go Back</a>
        </body>
        </html>
      `;
    
      // Send the HTML response
      return res.send(htmlResponse);
  } catch (error) {
    return res.send(jsonString)
  }
});

// Start the server
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
