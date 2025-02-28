import { useState, ChangeEvent, useEffect } from 'react'
import axios from 'axios'
import MediaPlayer from '../MediaPlayer/MediaPlayer'
import { API_URL } from '../../Config/';

function MediaConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [convertedVideos, setConvertedVideos] = useState<{ conversionId: string, status: string, url: string, thumbnails: { main: string } }[]>([]);
  const [poster, setPoster] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
    const video = convertedVideos.find(({ conversionId }) => conversionId === videoId);
    if (video?.status === 'completed') {
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
    const video = convertedVideos.find(({ conversionId }) => conversionId === videoId);
    if (video?.status === 'completed') {
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
      await fetchConvertedVideos(); // Refresh the list
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

        <div className="converted-videos-list">
          <h3>Converted Videos</h3>
          <ul className="videos-list">
            {convertedVideos.map(({ conversionId, thumbnails }) => (
              <li
                key={conversionId}
                onClick={() => handleVideoSelect(conversionId)}
                className="video-item"
              >
                <div className="video-id">
                  {thumbnails?.main ?
                    <img src={`${API_URL}${thumbnails?.main}`} alt="" width={80} height={50} /> :
                    // add loader
                    <div className="loader" />
                  }
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
    </>
  )
}

export default MediaConverter
