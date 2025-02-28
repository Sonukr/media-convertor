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
  limits: { fileSize: 150 * 1024 * 1024 }
});

// Store conversion jobs in memory
const conversions = new Map();
const conversionQueue = [];
let isProcessing = false;

// Process MP4 conversion
async function processMP4Conversion(conversionId, inputPath, outputPath) {
  return new Promise(async (resolve, reject) => {
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    ffmpeg(inputPath)
      .toFormat('mp4')
      .on('progress', (progress) => {
        const percentComplete = Math.round(progress.percent * 100) / 100;
        console.log(`MP4 Conversion [${conversionId}]: ${percentComplete}% complete.`);
      })
      .on('end', async() => {
        await generateThumbnail(inputPath, outputPath);
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .save(path.join(outputPath, 'video.mp4'));
  });
}

// Process Thumbnail generation
async function generateThumbnail(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const hasVideo = metadata.streams.some(stream => stream.codec_type === 'video');
      if (!hasVideo) {
        resolve(false);
        return;
      }

      // Get video duration in seconds
      const duration = metadata.format.duration;
      
      // Generate 10 thumbnails throughout the video
      const numberOfThumbnails = 10;
      const interval = duration / numberOfThumbnails;
      
      // Create timestamps array (in seconds)
      const timestamps = Array.from(
        { length: numberOfThumbnails }, 
        (_, i) => Math.floor(interval * i)
      );

      ffmpeg(inputPath)
        .screenshots({
          timestamps: timestamps,
          folder: outputDir,
          filename: 'thumbnail-%i.jpg',  // %i will be replaced with the index
          size: '160x90'  // Standard YouTube thumbnail preview size
        })
        .on('end', () => {
          // Generate one larger thumbnail for video preview
          ffmpeg(inputPath)
            .screenshots({
              timestamps: [1],  // Take from first second
              folder: outputDir,
              filename: 'thumbnail.jpg',
              size: '1280x720'  // Larger thumbnail for video preview
            })
            .on('end', () => {
              resolve(true);
            })
            .on('error', (err) => {
              reject(err);
            });
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  });
}

// Process HLS conversion
async function processHLSConversion(conversionId, inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .outputOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 5',
        '-hls_list_size 0',
        '-hls_segment_filename', path.join(outputDir, 'segment_%d.ts'),
        '-f hls'
      ])
      .output(path.join(outputDir, 'master.m3u8'))
      .on('progress', (progress) => {
        const percentComplete = Math.round(progress.percent * 100) / 100;
        console.log(`HLS Conversion [${conversionId}]: ${percentComplete}% complete.`);
      })
      .on('end', async () => {
        try {
          await generateThumbnail(inputPath, outputDir);
          resolve();
        } catch (err) {
          console.error(`Thumbnail generation failed: ${err.message}`);
          resolve(); // Continue even if thumbnail fails
        }
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Process next item in queue
async function processNextInQueue() {
  if (conversionQueue.length === 0 || isProcessing) {
    return;
  }

  isProcessing = true;
  const { conversionId, inputPath, outputPath, type } = conversionQueue.shift();

  // Decrement queue position for all remaining items
  for (const [id, conversion] of conversions) {
    if (conversion.status === 'queued' && conversion.queuePosition > 1) {
      conversion.queuePosition--;
    }
  }

  try {
    switch (type) {
      case 'hls':
        await processHLSConversion(conversionId, inputPath, outputPath);
        break;
      default:
        await processMP4Conversion(conversionId, inputPath, outputPath);
        break;
    }
    
    conversions.get(conversionId).status = 'completed';
    console.log(`Conversion completed. Output: ${outputPath}`);
    // Remove the uploaded file to avoid disk space issues
    fs.unlinkSync(inputPath);
  } catch (err) {
    conversions.get(conversionId).status = 'failed';
    conversions.get(conversionId).error = err.message;
    console.error(`Conversion failed: ${err.message}`);
  }
  isProcessing = false;
  processNextInQueue();
}

// POST route for media conversion
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const conversionId = uuidv4();
    const type = req.body.type || 'mp4'; // Default to mp4 if not specified
    
    const outputPath = path.join('converted', conversionId);
    
    // Ensure converted directory exists
    if (!fs.existsSync('converted')) {
      fs.mkdirSync('converted');
    }

    // Store conversion details
    conversions.set(conversionId, {
      status: 'queued',
      inputPath: req.file.path,
      outputPath: outputPath,
      type: type,
      queuePosition: conversionQueue.length + (isProcessing ? 1 : 0)
    });

    // Add to queue
    conversionQueue.push({
      conversionId,
      inputPath: req.file.path,
      outputPath,
      type
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

// GET route to list all conversions
router.get('/convert', (req, res) => {
  try {
    // Get tracked conversions and convert to array of objects
    const activeConversions = Array.from(conversions.entries()).map(([id, conv]) => ({
      conversionId: id,
      ...conv,
      thumbnails: fs.existsSync(path.join('converted', id, 'thumbnail.jpg')) ? {
        main: `/media/thumbnails/${id}/thumbnail.jpg`,
        previews: Array.from({ length: 10 }, (_, i) => 
          fs.existsSync(path.join('converted', id, `thumbnail-${i}.jpg`)) ?
            `/media/thumbnails/${id}/thumbnail-${i}.jpg` : null
        ).filter(Boolean)
      } : null,
      ...(conv.type === 'hls' ? {
        url: `/media/converted/${id}/master.m3u8`
      } : {
        url: `/media/converted/${id}/video.mp4`
      })
    }));
    
    // Scan converted directory for completed conversions not in memory
    const completedFiles = [];
    if (fs.existsSync('converted')) {
      const files = fs.readdirSync('converted');
      files.forEach(file => {
        const fullPath = path.join('converted', file);
        const stats = fs.statSync(fullPath);
        
        // Skip if not a directory or already in conversions map
        if (!stats.isDirectory() || conversions.has(file)) {
          return;
        }

        let conversionData = {
          status: 'completed',
          conversionId: file,
          // outputPath: fullPath
        };

        // Check for HLS conversion
        const m3u8Path = path.join(fullPath, 'master.m3u8');
        if (fs.existsSync(m3u8Path)) {
          conversionData.type = 'hls';
          conversionData.url = `/media/converted/${file}/master.m3u8`;
        } 
        // Check for MP4 conversion
        else if (fs.existsSync(path.join(fullPath, 'video.mp4'))) {
          conversionData.type = 'mp4';
          conversionData.url = `/media/converted/${file}/video.mp4`;
        }

        // Check for thumbnails
        if (fs.existsSync(path.join(fullPath, 'thumbnail.jpg'))) {
          conversionData.thumbnails = {
            main: `/media/thumbnails/${file}/thumbnail.jpg`,
            previews: Array.from({ length: 10 }, (_, i) => 
              fs.existsSync(path.join(fullPath, `thumbnail-${i}.jpg`)) ?
                `/media/thumbnails/${file}/thumbnail-${i}.jpg` : null
            ).filter(Boolean)
          };
        }

        if (conversionData.type) {  // Only add if it's a valid conversion
          completedFiles.push(conversionData);
        }
      });
    }

    // Combine active and completed conversions
    res.json([...activeConversions, ...completedFiles]);
  } catch (error) {
    console.error('Error listing conversions:', error);
    res.status(500).json({ error: 'Failed to list conversions' });
  }
});

// GET route to check conversion status and download file
router.get('/convert/:conversionId', (req, res) => {
  const { conversionId } = req.params;
  const conversion = conversions.get(conversionId);
  const convertedPath = path.join('converted', conversionId);

  // Check if the output exists
  const outputExists = fs.existsSync(convertedPath);
  if (!outputExists || !conversion) {
    return res.status(404).json({ error: 'Converted file not found' });
  }

  if (conversion?.status === 'completed' || outputExists) {
    // Add thumbnail URLs to the response
    const thumbnailUrls = {
      main: `/media/thumbnails/${conversionId}/thumbnail.jpg`,
      previews: Array.from({ length: 10 }, (_, i) => 
        `/media/thumbnails/${conversionId}/thumbnail-${i}.jpg`
      )
    };

    if (conversion?.type === 'hls') {
      return res.json({
        status: 'completed',
        url: `/media/converted/${conversionId}/master.m3u8`,
        thumbnails: thumbnailUrls
      });
    } else {
      const videoPath = path.join(convertedPath, 'video.mp4');
      return res.download(videoPath, (err) => {
        if (err) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      });
    }
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

router.delete('/convert/:conversionId', (req, res) => {
  const { conversionId } = req.params;
  const conversion = conversions.get(conversionId);
  
  try {
    // Delete from queue if present
    const queueIndex = conversionQueue.findIndex(item => item.conversionId === conversionId);
    if (queueIndex !== -1) {
      conversionQueue.splice(queueIndex, 1);
    }

    // Delete input file if it exists
    if (conversion?.inputPath && fs.existsSync(conversion.inputPath)) {
      fs.unlinkSync(conversion.inputPath);
    }

    // Delete converted files and folder
    const convertedPath = path.join('converted', conversionId);

    if(!fs.existsSync(convertedPath)) {
      return res.status(404).json({ error: 'Conversion not found', conversionId });
    }

    // Check and delete HLS directory if it exists
    if (fs.lstatSync(convertedPath).isDirectory()) {
      fs.rmSync(convertedPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(convertedPath);
    }

    // Remove from conversions map
    conversions.delete(conversionId);
    
    res.json({ message: 'All files deleted', conversionId });
  } catch (error) {
    console.error(`Error deleting conversion: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete conversion' });
  }
});

// Update existing HLS route to handle both paths
router.get(['/converted/:conversionId/master.m3u8'], (req, res) => {
  const { conversionId } = req.params;
  const hlsPath = path.join('converted', conversionId, 'master.m3u8');
  
  // Add error handling
  if (!fs.existsSync(hlsPath)) {
    return res.status(404).json({ error: 'HLS playlist not found' });
  }
  
  res.sendFile(path.resolve(hlsPath));
});

// Also need to add a route for HLS segments
router.get(['/converted/:conversionId/segment_:id.ts'], (req, res) => {
  const { conversionId, id } = req.params;
  const segmentPath = path.join('converted', conversionId, `segment_${id}.ts`);
  
  if (!fs.existsSync(segmentPath)) {
    return res.status(404).json({ error: 'Segment not found' });
  }
  
  res.sendFile(path.resolve(segmentPath));
});

// GET route to serve thumbnails
router.get('/thumbnails/:conversionId/:filename', (req, res) => {
  const { conversionId, filename } = req.params;
  const thumbnailPath = path.join('converted', conversionId, filename);
  
  if (fs.existsSync(thumbnailPath)) {
    res.sendFile(path.resolve(thumbnailPath));
  } else {
    res.status(404).json({ error: 'Thumbnail not found' });
  }
});

// Add route to serve MP4 files
router.get(['/converted/:conversionId/video.mp4'], (req, res) => {
  const { conversionId } = req.params;
  const videoPath = path.join('converted', conversionId, 'video.mp4');
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }
  
  res.sendFile(path.resolve(videoPath));
});

module.exports = router; 