const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Store conversion jobs in memory
const conversions = new Map();
const conversionQueue = [];
let isProcessing = false;

// Process next item in queue
async function processNextInQueue() {
  if (conversionQueue.length === 0 || isProcessing) {
    return;
  }

  isProcessing = true;
  const { conversionId, inputPath, outputPath } = conversionQueue.shift();

  ffmpeg(inputPath)
    .toFormat('mp4')
    .on('progress', (progress) => {
      console.log(`Processing: ${progress.percent}% done`);
    })
    .on('end', () => {
      conversions.get(conversionId).status = 'completed';
      console.log(`Conversion completed. File saved to: ${outputPath}`);
      // Clean up input file
      fs.unlinkSync(inputPath);
      isProcessing = false;
      // Process next item if queue not empty
      processNextInQueue();
    })
    .on('error', (err) => {
      conversions.get(conversionId).status = 'failed';
      conversions.get(conversionId).error = err.message;
      console.error(`Conversion failed: ${err.message}`);
      isProcessing = false;
      // Process next item if queue not empty
      processNextInQueue();
    })
    .save(outputPath);
}

// POST route for media conversion
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const conversionId = uuidv4();
    const outputPath = path.join('converted', `${conversionId}.mp4`);
    
    // Ensure converted directory exists
    if (!fs.existsSync('converted')) {
      fs.mkdirSync('converted');
    }

    // Store conversion details
    conversions.set(conversionId, {
      status: 'queued',
      inputPath: req.file.path,
      outputPath: outputPath,
      queuePosition: conversionQueue.length + (isProcessing ? 1 : 0)
    });

    // Add to queue
    conversionQueue.push({
      conversionId,
      inputPath: req.file.path,
      outputPath
    });

    // Start processing if not already processing
    processNextInQueue();

    res.json({ 
      conversionId,
      message: 'Conversion queued',
      queuePosition: conversions.get(conversionId).queuePosition
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to check conversion status and download file
router.get('/convert/:conversionId', (req, res) => {
  const { conversionId } = req.params;
  const conversion = conversions.get(conversionId);

  if (!conversion) {
    return res.status(404).json({ error: 'Conversion not found' });
  }

  if (conversion.status === 'completed') {
    return res.download(conversion.outputPath, (err) => {
      if (err) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  }

  if (conversion.status === 'failed') {
    return res.status(400).json({ 
      status: 'failed',
      error: conversion.error 
    });
  }

  // For queued items, calculate current position
  if (conversion.status === 'queued') {
    const currentPosition = conversionQueue.findIndex(item => item.conversionId === conversionId);
    conversion.queuePosition = currentPosition + 1;
  }

  res.json({ 
    status: conversion.status,
    queuePosition: conversion.status === 'queued' ? conversion.queuePosition : null
  });
});

module.exports = router; 