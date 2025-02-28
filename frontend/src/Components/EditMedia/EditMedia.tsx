import React, { useState, ChangeEvent, useEffect } from 'react'
import axios from 'axios'
import './editmedia.css';
import MediaPlayer from '../MediaPlayer/MediaPlayer'
import { API_URL } from '../../Config/';
import { Box, Slider } from '@mui/material';

function EditMedia() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [poster, setPoster] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [value, setValue] = React.useState([0, 100]);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [marks, setMarks] = useState<{ value: number; label: string }[]>([]);

  const handleChange = (event, newValue) => {
    // Ensure start time is not more than end value
    // and end value is not less than start time
    if (newValue[0] >= newValue[1]) {
      newValue[0] = newValue[1]; // Set start to end if start is greater
    }
    if (newValue[1] <=newValue[0]) {
      newValue[1] = newValue[0]; // Set end to start if end is less
    }
    
    console.log(event, newValue);
    setValue(newValue);
  };

  useEffect(() => {
    if (videoDuration > 0) {
      const maxMarks = 10;
      const interval = Math.ceil(videoDuration / (maxMarks - 1));
      const newMarks = Array.from({ length: Math.min(maxMarks, Math.floor(videoDuration / interval) + 1) }, (_, index) => {
        const value = index * interval;
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        const label = videoDuration <= 60 
          ? `${seconds} sec` 
          : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        return {
          value,
          label,
        };
      });

      // Ensure the last mark is the final duration
      if (newMarks[newMarks.length - 1].value !== videoDuration) {
        const finalMinutes = Math.floor(videoDuration / 60);
        const finalSeconds = Math.floor(videoDuration % 60);
        const finalLabel = videoDuration <= 60 
          ? `${finalSeconds} sec` 
          : `${finalMinutes}:${finalSeconds < 10 ? '0' : ''}${finalSeconds}`;
        newMarks.push({
          value: videoDuration,
          label: finalLabel,
        });
      }

      setMarks(newMarks);
    }
  }, [videoDuration]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setSelectedFile(null);
    setPoster('');
    setVideoUrl('');
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setVideoUrl(URL.createObjectURL(file));

      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(file);
      videoElement.onloadedmetadata = () => {
        setVideoDuration(videoElement.duration);
      };
    } else {
      alert('Please select a valid video file');
    }
  };


  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', 'hls');

    try {
      await axios.post(`${API_URL}/media/convert`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      alert('Video uploaded successfully!');
      
      setSelectedFile(null);
      setVideoUrl('');
      setPoster('');
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <div className="video-preview">
        {(selectedFile || videoUrl) ? (
          <div>
            <MediaPlayer 
              source={videoUrl || (selectedFile && URL.createObjectURL(selectedFile))}
              poster={poster} 
              startTime={value[0]}
            />
            <div className="cutterWrapper">
              {/* render 10 images with 50*50 */}
              <div className="imageRow">
                {Array.from({ length: 10 }).map((_, index) => (
                  <img
                    key={index}
                    src="https://picsum.photos/100" // Placeholder image URL
                    alt={`Dummy ${index + 1}`}
                  />
                ))}
              </div>
              <Box sx={{ width: '100%', position: 'absolute', top: 0 }}>
                <Slider
                  getAriaLabel={() => 'Video duration'}
                  value={value}
                  onChange={handleChange}
                  valueLabelDisplay="auto"
                  min={0}
                  max={videoDuration}
                  step={1}
                  marks={marks}
                  getAriaValueText={(val) =>  `${val}`}
                  sx={{
                    height: 30,
                    '& .MuiSlider-thumb': {
                      borderRadius: 0,
                      backgroundColor: 'yellow',
                      width: 0,
                      cursor: 'ew-resize'
                    },
                    '& .MuiSlider-track': {
                      height: 55,
                      border: '4px solid yellow',
                      background: 'transparent'
                    },
                    '& .MuiSlider-rail': {
                      height: 0,
                    },
                    '& .MuiSlider-markLabel' :{
                      color: '#fff',
                      marginTop: 4,
                      marginLeft: 2
                    }
                  }}
                />
              </Box>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            No video selected
          </div>
        )}
      </div>
      <div className="upload-section">
        <label className="upload-button" htmlFor="video-upload">
          Choose Video File
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
        {selectedFile && (
          <div className="file-info">
            <p>Selected file: {selectedFile.name}</p>
            <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              className="upload-submit-button"
            >
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </button>
            {isUploading && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}

export default EditMedia
