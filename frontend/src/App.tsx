import { useState, ChangeEvent, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import MediaPlayer from './Components/MediaPlayer/MediaPlayer'
import { API_URL } from './Config';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [convertedVideos, setConvertedVideos] = useState<{conversionId: string, url: string, thumbnails: {main: string}}[]>([]);
  const [poster, setPoster] = useState<string>('');

  useEffect(() => {
    fetchConvertedVideos();
  }, []);

  const fetchConvertedVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/media/convert`);
      setConvertedVideos(response.data);
    } catch (error) {
      console.error('Error fetching converted videos:', error);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    const video = convertedVideos.find(({conversionId}) => conversionId === videoId);
    if (video) {
      setVideoUrl(`${API_URL}${video?.url}`);
      setPoster(`${API_URL}${video?.thumbnails?.main}`);
    }
  
    setSelectedFile(null);
  };

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
    } else {
      alert('Please select a valid video file');
    }
  };

  const handleDeleteVideo = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the video selection
    try {
      await axios.delete(`${API_URL}/media/convert/${videoId}`);
      // Refresh the videos list after deletion
      await fetchConvertedVideos();
      // Clear the current video if it was the one that was deleted
      if (videoUrl.includes(videoId)) {
        setVideoUrl('');
        setPoster('');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  return (
    <div className="app-container">
      <div className="video-preview">
        { (selectedFile || videoUrl) ? (
          <MediaPlayer source={videoUrl || (selectedFile && URL.createObjectURL(selectedFile))} poster={poster} />
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
          </div>
        )}
        
        <div className="converted-videos-list">
          <h3>Converted Videos</h3>
          <ul className="videos-list">
            {convertedVideos.map(({conversionId, thumbnails}) => (
              <li 
                key={conversionId} 
                onClick={() => handleVideoSelect(conversionId)}
                className="video-item"
              >
                <div className="video-id">
                  <img src={`${API_URL}${thumbnails?.main}`} alt="" width={80} height={50}/> 
                  <span>{conversionId}</span>
                </div>
                <div className="video-actions">
                  <span className="play-icon">▶</span>
                  <button 
                    className="delete-button"
                    onClick={(e) => handleDeleteVideo(conversionId, e)}
                  >
                   🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
