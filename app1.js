const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');

// Initialize the app
const app = express();
const port = 3000;

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

  // Extracted data
  const extractedData = extractDetailsFromText(text);

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
        <li><strong>Full Name:</strong> ${extractedData.fullName || 'N/A'}</li>
        <li><strong>Date of Birth:</strong> ${extractedData.dob || 'N/A'}</li>
        <li><strong>Nationality:</strong> ${extractedData.nationality || 'N/A'}</li>
        <li><strong>Identification Number:</strong> ${extractedData.idNumber || 'N/A'}</li>
        <li><strong>Address:</strong> ${extractedData.address || 'N/A'}</li>
        <li><strong>City:</strong> ${extractedData.city || 'N/A'}</li>
        <li><strong>Pincode/Zip:</strong> ${extractedData.pincode || 'N/A'}</li>
        <li><strong>Country:</strong> ${extractedData.country || 'N/A'}</li>
        <li><strong>Full Text:</strong> ${extractedData.issueDate || 'N/A'}</li>
      </ul>
      <a href="/">Go Back</a>
    </body>
    </html>
  `;

  // Send the HTML response
  return res.send(htmlResponse);
});

// Helper function to extract details from text
function extractDetailsFromText(text) {
  const extractedData = {
    fullName: extractPattern(text, /Full Name: (.+?)(?=\n|$)/),
    dob: extractPattern(text, /Date of Birth: (\d{2}\/\d{2}\/\d{4})/),
    nationality: extractPattern(text, /Nationality: (.+?)(?=\n|$)/),
    idNumber: extractPattern(text, /Identification Number: (.+?)(?=\n|$)/),
    address: extractPattern(text, /Address: (.+?)(?=\n|$)/),
    city: extractPattern(text, /City: (.+?)(?=\n|$)/),
    pincode: extractPattern(text, /Pincode\/Zip: (\d+)/),
    country: extractPattern(text, /Country: (.+?)(?=\n|$)/),
    issueDate: text,
  };
  return extractedData;
}

// Helper function to extract patterns from text using regex
function extractPattern(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

// Start the server
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
